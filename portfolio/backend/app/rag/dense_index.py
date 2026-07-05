"""Pinecone dense vector index (OpenAI 1536-d embeddings, cosine).

Pinecone's client is synchronous; query() is offloaded with asyncio.to_thread
so it never blocks the FastAPI event loop.
"""

import asyncio
from typing import Any, Dict, List

from pinecone import Pinecone, ServerlessSpec

from app.core.config import Settings
from app.core.logging import get_logger
from app.rag._util import pget

logger = get_logger(__name__)


class DenseIndex:
    """Manages the dense serverless index for semantic (vector) retrieval."""

    def __init__(self, pc: Pinecone, settings: Settings):
        self.pc = pc
        self.settings = settings
        self.name = settings.pinecone_dense_index
        self.namespace = settings.pinecone_namespace
        self._index = None

    def ensure_index(self) -> None:
        """Create the dense index at the embedding dimension if it's missing."""
        if not self.pc.has_index(self.name):
            logger.info(
                "Creating dense index '%s' (dim=%d, metric=%s)",
                self.name, self.settings.openai_embedding_dim, self.settings.pinecone_metric,
            )
            self.pc.create_index(
                name=self.name,
                spec=ServerlessSpec(
                    cloud=self.settings.pinecone_cloud,
                    region=self.settings.pinecone_region,
                ),
                dimension=self.settings.openai_embedding_dim,
                metric=self.settings.pinecone_metric,
            )
        self._index = self.pc.Index(self.name)

    @property
    def index(self):
        if self._index is None:
            self._index = self.pc.Index(self.name)
        return self._index

    def upsert(self, vectors: List[Dict[str, Any]]) -> int:
        """Upsert `{id, values, metadata}` dicts. Safe to re-run (idempotent)."""
        if not vectors:
            return 0
        self.index.upsert(
            vectors=vectors,
            namespace=self.namespace,
            batch_size=self.settings.pinecone_upsert_batch_size,
        )
        return len(vectors)

    async def query(self, vector: List[float], top_k: int) -> List[Dict[str, Any]]:
        resp = await asyncio.to_thread(
            self.index.query,
            vector=vector,
            top_k=top_k,
            namespace=self.namespace,
            include_metadata=True,
        )
        matches = pget(resp, "matches", []) or []
        results: List[Dict[str, Any]] = []
        for m in matches:
            md = pget(m, "metadata", {}) or {}
            results.append({
                "id": pget(m, "id", ""),
                "text": pget(md, "text", ""),
                "source": pget(md, "source", ""),
                "score": float(pget(m, "score", 0.0) or 0.0),
                "retriever": "dense",
            })
        return results
