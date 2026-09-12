"""
AI Worker - consumes ai_queue, orchestrates via LangGraph/LangChain,
calls models via LiteLLM (docs/ai-system.md).

Infra skeleton: queue loop, concurrency cap, timeout, retry, heartbeat,
AI-config fetch, agent roles (PLA/RBAC), input/output guards, and
telemetry - all decided pre-hackathon per docs/ai-system.md. The
LangGraph workflow in run_graph() is domain-specific, defined at kickoff.
"""
import asyncio
import json
import os
import time

import httpx
import redis.asyncio as redis
from redis.exceptions import TimeoutError as RedisTimeoutError  # Added for exception handling
from dotenv import load_dotenv

from ai import main as run_ai
from shared.security_guards import input_guard, output_guard

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
MAIN_SERVICE_URL = os.environ.get("MAIN_SERVICE_URL", "http://main-service:8000")
QUEUE_NAME = "ai_queue"
CONCURRENCY_LIMIT = int(os.environ.get("AI_WORKER_CONCURRENCY", "5"))
JOB_TIMEOUT_SECONDS = int(os.environ.get("AI_JOB_TIMEOUT", "60"))
RESULT_TTL_SECONDS = 3600
CONFIG_CACHE_TTL_SECONDS = 30
HEARTBEAT_KEY = f"heartbeat:ai-worker:{os.environ.get('HOSTNAME', 'unknown')}"
JOB_CALLBACK_URL = os.environ.get(
    "JOB_CALLBACK_URL",
    "http://main-service:8000/api/internal/worker-result"
)

semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
_config_cache = {"data": None, "fetched_at": 0.0}

# --- Agent roles (RBAC) - docs/ai-system.md par 4.2. Code, not Dynamic
# Config: permissions shouldn't be one Django-Admin click away from
# being loosened. Tool names filled in at kickoff; each graph node is
# bound to exactly one role's tool list, never the full registry.
AGENT_ROLES = {
    "retriever":       {"tools": [], "can_act_externally": False},
    "responder":       {"tools": [], "can_act_externally": False},
    "action_executor": {"tools": [], "can_act_externally": True},
}


async def get_ai_config() -> dict:
    """Fetched from Main Service, not Postgres directly - cached briefly to avoid a round-trip per call."""
    now = time.time()
    if _config_cache["data"] is None or now - _config_cache["fetched_at"] > CONFIG_CACHE_TTL_SECONDS:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{MAIN_SERVICE_URL}/api/internal/ai-config")
            response.raise_for_status()
            _config_cache["data"] = response.json()["data"]
            _config_cache["fetched_at"] = now
    return _config_cache["data"]


async def log_ai_call(**fields) -> None:
    """Telemetry - docs/ai-system.md par 4.4/6.2. Posted to Main Service, not
    written to Postgres directly (only Main Service touches Postgres)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(f"{MAIN_SERVICE_URL}/api/internal/ai-calls", json=fields)
    except Exception as exc:  # noqa: BLE001 - telemetry failure must never break the job
        print(f"telemetry log failed (non-fatal): {exc}")



async def run_graph(job: dict, role: str):
    """Delegate AI work to the AI implementation module."""
    return await run_ai(job, role)



async def process_job(r: redis.Redis, job: dict):
    job_id = job.get("job_id", "unknown_job")
    agent_role = job.get("agent_role", "responder")

    started_at = time.time()

    async with semaphore:
        try:
            print(f"[WORKER] Processing job: {job_id}")

            # Run AI intelligence pipeline (fetching batch, input guard, multimodal perception,
            # spatial routing, deduplication, dossier generation, output guard, dispatch)
            result = await asyncio.wait_for(
                run_graph(
                    job,
                    role=agent_role,
                ),
                timeout=JOB_TIMEOUT_SECONDS,
            )

            # Save result in Redis
            result_payload = {
                "status": "done",
                "result": result,
            }

            await r.set(
                f"result:{job_id}",
                json.dumps(result_payload),
                ex=RESULT_TTL_SECONDS,
            )

            # Optional callback to legacy worker-result endpoint
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    await client.post(
                        f"{JOB_CALLBACK_URL}/{job_id}",
                        json=result_payload,
                    )
            except Exception as cb_err:
                pass

            latency = int((time.time() - started_at) * 1000)
            print(f"[WORKER] Job {job_id} completed in {latency}ms")

            flagged = False
            if isinstance(result, dict):
                flagged = result.get("classification", {}).get("security_flagged", False)

            await log_ai_call(
                job_id=job_id,
                agent_role=agent_role,
                status="done",
                latency_ms=latency,
                flagged_input=flagged,
            )

        except Exception as exc:
            error_payload = {
                "status": "error",
                "error": str(exc),
            }

            # Save error in Redis
            await r.set(
                f"result:{job_id}",
                json.dumps(error_payload),
                ex=RESULT_TTL_SECONDS,
            )

            # Send error back to Django (non-fatal if unreachable)
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    await client.post(
                        f"{JOB_CALLBACK_URL}/{job_id}",
                        json=error_payload,
                    )
            except Exception:
                pass

            print(f"[WORKER] Job {job_id} failed: {exc}")

            await log_ai_call(
                job_id=job_id,
                agent_role=agent_role,
                status="error",
                latency_ms=int((time.time() - started_at) * 1000),
                error=str(exc),
            )


async def heartbeat_loop(r: redis.Redis):
    while True:
        await r.set(HEARTBEAT_KEY, str(time.time()), ex=15)
        await asyncio.sleep(5)


async def main():
    r = redis.from_url(REDIS_URL)
    asyncio.create_task(heartbeat_loop(r))
    print(f"AI worker started, listening on '{QUEUE_NAME}'")
    while True:
        try:
            job_data = await r.blpop(QUEUE_NAME, timeout=5)
            if not job_data:
                continue

            _, raw_job = job_data
            try:
                job = json.loads(raw_job)
                if isinstance(job, str):
                    job = {"job_id": job}
            except Exception:
                job = {"job_id": str(raw_job)}

            asyncio.create_task(process_job(r, job))

        except (RedisTimeoutError, TimeoutError):
            continue
        except Exception as e:
            print(f"Worker polling error: {e}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())

