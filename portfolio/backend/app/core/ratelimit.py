"""Per-IP rate limiting (slowapi).

Note: the default in-memory store is per-process. For multiple workers/replicas,
point slowapi at Redis via `storage_uri`.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

limiter = Limiter(key_func=get_remote_address)


def rate_limit() -> str:
    """Callable limit so the value tracks settings at request time."""
    return get_settings().rate_limit
