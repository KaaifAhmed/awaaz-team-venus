"""
AI Worker Service.
Listens on TWO Redis queues:
 - "ai_queue": full web-report jobs (existing LangGraph pipeline in ai.py)
 - "conversation_queue": small WhatsApp conversation AI tasks (conversation.py)
"""
import asyncio
import json
import logging
import time

import redis.asyncio as redis
from redis.exceptions import TimeoutError as RedisTimeoutError
from dotenv import load_dotenv

from ai import main as run_ai_pipeline
from conversation import run_conversation_job
from config import REDIS_URL, QUEUE_NAME, CONVERSATION_QUEUE_NAME

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ai-worker-main")


async def process_ai_job(r: redis.Redis, job_payload: dict) -> None:
    job_id = job_payload.get("job_id", "unknown_job")
    started_at = time.time()
    logger.info(f"[WORKER] Processing AI job: {job_id}")
    try:
        result = await run_ai_pipeline(job_payload)
        await r.set(f"result:{job_id}", json.dumps({"status": "done", "result": result}), ex=3600)
        latency = int((time.time() - started_at) * 1000)
        logger.info(f"[WORKER] AI job {job_id} completed in {latency}ms")
    except Exception as exc:
        logger.error(f"[WORKER] AI job {job_id} failed: {exc}")
        await r.set(f"result:{job_id}", json.dumps({"status": "error", "error": str(exc)}), ex=3600)


async def process_conversation_job(job_payload: dict) -> None:
    job_type = job_payload.get("job_type")
    session_id = job_payload.get("session_id")
    logger.info(f"[WORKER] Processing conversation job: {job_type} for session {session_id}")
    try:
        await run_conversation_job(job_payload)
        logger.info(f"[WORKER] Conversation job {job_type} for session {session_id} completed")
    except Exception as exc:
        logger.error(f"[WORKER] Conversation job {job_type} for session {session_id} failed: {exc}")


async def main() -> None:
    r = redis.from_url(REDIS_URL)
    logger.info(f"AI worker started, listening on '{QUEUE_NAME}' and '{CONVERSATION_QUEUE_NAME}'")

    while True:
        try:
            # BLPOP on multiple keys: returns as soon as EITHER queue has a job
            job_data = await r.blpop([QUEUE_NAME, CONVERSATION_QUEUE_NAME], timeout=5)
            if not job_data:
                continue

            queue_name, raw_payload = job_data
            queue_name = queue_name.decode() if isinstance(queue_name, bytes) else queue_name

            try:
                job = json.loads(raw_payload)
                if isinstance(job, str):
                    job = {"job_id": job}
            except Exception:
                job = {"job_id": str(raw_payload)}

            if queue_name == QUEUE_NAME:
                asyncio.create_task(process_ai_job(r, job))
            else:
                asyncio.create_task(process_conversation_job(job))

        except (RedisTimeoutError, TimeoutError):
            continue
        except Exception as err:
            logger.warning(f"Worker polling error: {err}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())