"""Simple Redis-backed caching utilities."""

from __future__ import annotations

import hashlib
import json
import os
from typing import TYPE_CHECKING, Any, Awaitable, Callable, Optional, TypeVar, cast

try:
    from redis import asyncio as aioredis
except Exception:  # pragma: no cover
    aioredis = None

if TYPE_CHECKING:
    from redis.asyncio import Redis
else:  # pragma: no cover
    Redis = Any

T = TypeVar("T")

_redis: Optional[Redis] = None


class _DummyCache:
    async def get(self, key: str) -> Optional[str]:  # pragma: no cover - simple stub
        return None

    async def setex(self, key: str, ttl: int, value: str) -> None:  # pragma: no cover - stub
        return None

    async def delete(self, *keys: str) -> int:  # pragma: no cover - stub
        return 0

    async def flushdb(self) -> None:  # pragma: no cover - stub
        return None

    async def keys(self, pattern: str) -> list[str]:  # pragma: no cover - stub
        return []


def get_redis() -> Redis | _DummyCache:
    """Return a Redis client or a dummy fallback if unavailable."""
    global _redis
    if _redis is not None:
        return _redis
    if aioredis is None:
        _redis = _DummyCache()
        return _redis
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    try:
        _redis = aioredis.from_url(url, encoding="utf-8", decode_responses=True)
    except Exception:  # pragma: no cover - connection failure fallback
        _redis = _DummyCache()
    return _redis


def _make_key(func: Callable[..., Any], args: tuple[Any, ...], kwargs: dict[str, Any]) -> str:
    raw = json.dumps(
        [func.__module__, func.__qualname__, args, kwargs],
        default=str,
        sort_keys=True,
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def cached(ttl: int = 3600) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Decorator to cache async function results in Redis."""

    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            redis = get_redis()
            key = _make_key(func, args, kwargs)
            try:
                cached_val = await redis.get(key)
                if cached_val is not None:
                    return cast(T, json.loads(cached_val))
            except Exception:
                pass
            result = await func(*args, **kwargs)
            try:
                await redis.setex(key, ttl, json.dumps(result))
            except Exception:
                pass
            return result

        return wrapper

    return decorator


async def invalidate_prefix(prefix: str) -> int:
    """Delete cache entries matching prefix, returning count removed."""
    redis = get_redis()
    try:
        keys = await redis.keys(prefix + "*")
        if keys:
            await redis.delete(*keys)
        return len(keys)
    except Exception:  # pragma: no cover
        return 0


async def flush_cache() -> None:
    """Flush entire cache store."""
    redis = get_redis()
    try:
        await redis.flushdb()
    except Exception:  # pragma: no cover
        pass
