"""Dense embeddings via the OpenAI Embeddings API (text-embedding-3-small, 1536-d).

Async and batched. Shares the app-wide AsyncOpenAI client.
"""

from typing import List

from openai import APIError, RateLimitError
from openai import AsyncOpenAI

from app.core.config import Settings
from app.core.errors import RateLimitExceededError


class DenseEmbedder:
    """Generates dense query/document vectors with OpenAI embeddings."""

    def __init__(self, client: AsyncOpenAI, settings: Settings):
        self.client = client
        self.settings = settings
        self.model = settings.openai_embedding_model
        self.batch_size = settings.openai_embedding_batch_size

    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts, batched to respect payload limits."""
        if not texts:
            return []
        vectors: List[List[float]] = []
        for start in range(0, len(texts), self.batch_size):
            batch = texts[start:start + self.batch_size]
            try:
                resp = await self.client.embeddings.create(model=self.model, input=batch)
            except RateLimitError as exc:
                raise RateLimitExceededError("OpenAI embeddings rate limit exceeded.") from exc
            except APIError as exc:
                raise RuntimeError(f"OpenAI embeddings failed: {exc}") from exc
            vectors.extend(item.embedding for item in resp.data)
        return vectors

    async def embed_query(self, query: str) -> List[float]:
        if not query or not query.strip():
            raise ValueError("Cannot embed empty query")
        result = await self.embed([query])
        return result[0]
