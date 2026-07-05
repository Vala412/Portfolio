"""Shared AsyncOpenAI client factory.

One long-lived AsyncOpenAI instance is reused across the app (it holds a
connection pool). Built-in retries/backoff and a request timeout are configured
here so callers don't reimplement them.
"""

from openai import AsyncOpenAI

from app.core.config import Settings


def build_async_openai(settings: Settings) -> AsyncOpenAI:
    """Create the shared AsyncOpenAI client from settings."""
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_timeout_seconds,
        max_retries=settings.openai_max_retries,
    )
