"""ARQ (Redis-backed) job queue setup.

The API enqueues jobs onto Redis; the worker process (`app.workers`) consumes
them. Both sides build their Redis connection from the same settings.
"""

from __future__ import annotations

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import Settings

# Job names must match the worker function names exactly.
VOICE_PROCESSING_JOB = "process_voice"
VOICE_EXTRACTION_JOB = "extract_voice"
RECEIPT_PROCESSING_JOB = "process_receipt"


def redis_settings(settings: Settings) -> RedisSettings:
    """Build ARQ Redis settings from the application config."""
    return RedisSettings.from_dsn(settings.redis_url)


async def create_redis_pool(settings: Settings) -> ArqRedis:
    """Create an ARQ Redis pool used to enqueue jobs."""
    return await create_pool(redis_settings(settings))
