"""
AI Worker Service.
Consumes job IDs from Redis ai_queue and executes the LangGraph AI pipeline.
"""
import asyncio
import json
import logging
import os
import time

import redis.asyncio as redis
from redis.exceptions import TimeoutError as RedisTimeoutError
from dotenv import load_dotenv

from ai import main as run_ai_pipeline
from config import REDIS_URL, QUEUE_NAME

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ai-worker-main")


async def process_job(r: redis.Redis, job_payload: dict) -> None:
    """Processes a single civic grievance job and stores the result in Redis."""
    job_id = job_payload.get("job_id", "unknown_job")
    started_at = time.time()
    logger.info(f"[WORKER] Processing job: {job_id}")

    try:
        # Run the LangGraph AI pipeline
        result = await run_ai_pipeline(job_payload)

        # Store completed result in Redis (1h TTL)
        await r.set(
            f"result:{job_id}",
            json.dumps({"status": "done", "result": result}),
            ex=3600,
        )

        latency = int((time.time() - started_at) * 1000)
        logger.info(f"[WORKER] Job {job_id} completed successfully in {latency}ms")

    except Exception as exc:
        logger.error(f"[WORKER] Job {job_id} failed: {exc}")
        await r.set(
            f"result:{job_id}",
            json.dumps({"status": "error", "error": str(exc)}),
            ex=3600,
        )


async def main() -> None:
    """Continuous worker queue loop."""
    r = redis.from_url(REDIS_URL)
    logger.info(f"AI worker started, listening on '{QUEUE_NAME}'")

    while True:
        try:
            job_data = await r.blpop(QUEUE_NAME, timeout=5)
            if not job_data:
                continue

            _, raw_payload = job_data
            try:
                job = json.loads(raw_payload)
                if isinstance(job, str):
                    job = {"job_id": job}
            except Exception:
                job = {"job_id": str(raw_payload)}

            # Process job asynchronously
            asyncio.create_task(process_job(r, job))

        except (RedisTimeoutError, TimeoutError):
            continue
        except Exception as err:
            logger.warning(f"Worker polling error: {err}")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
