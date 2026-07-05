"""Hybrid retriever: dense + sparse recall, merged, then reranked.

Pipeline (all async, dense & sparse run concurrently):
    query
      ├─ dense:  OpenAI embed → Pinecone dense index (top_k)
      └─ sparse: Pinecone integrated sparse index (top_k)
    → union / dedupe candidates
    → Pinecone cross-encoder rerank → top-N
If one retriever fails, the other still serves results (graceful degradation).
"""

import asyncio
from typing import Any, Dict, List, Optional

from app.core.config import Settings
from app.core.logging import get_logger
from app.rag.dense_index import DenseIndex
from app.rag.embedder import DenseEmbedder
from app.rag.reranker import PineconeReranker
from app.rag.sparse_index import SparseIndex

logger = get_logger(__name__)


class HybridRetriever:
    """Dense + sparse retrieval fused by cross-encoder reranking."""

    def __init__(
        self,
        settings: Settings,
        embedder: DenseEmbedder,
        dense_index: DenseIndex,
        sparse_index: SparseIndex,
        reranker: PineconeReranker,
    ):
        self.settings = settings
        self.embedder = embedder
        self.dense_index = dense_index
        self.sparse_index = sparse_index
        self.reranker = reranker

    async def retrieve(self, query: str, top_n: Optional[int] = None) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        top_n = top_n or self.settings.rerank_top_n

        query_vector = await self.embedder.embed_query(query)
        dense_hits, sparse_hits = await asyncio.gather(
            self.dense_index.query(query_vector, self.settings.dense_top_k),
            self.sparse_index.search(query, self.settings.sparse_top_k),
            return_exceptions=True,
        )
        dense_hits = self._unwrap(dense_hits, "dense")
        sparse_hits = self._unwrap(sparse_hits, "sparse")

        merged = self._merge(dense_hits, sparse_hits)
        logger.info(
            "retrieval dense=%d sparse=%d merged=%d", len(dense_hits), len(sparse_hits), len(merged),
        )
        if not merged:
            return []
        return await self.reranker.rerank(query, merged, top_n)

    @staticmethod
    def _unwrap(result: Any, name: str) -> List[Dict[str, Any]]:
        if isinstance(result, Exception):
            logger.warning("%s retrieval failed: %s", name, result)
            return []
        return result

    @staticmethod
    def _merge(
        dense: List[Dict[str, Any]], sparse: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Union candidates, dedupe by id (fallback to text), preserve order."""
        seen: set = set()
        merged: List[Dict[str, Any]] = []
        for hit in [*dense, *sparse]:
            text = hit.get("text") or ""
            if not text.strip():
                continue
            key = hit.get("id") or text[:80]
            if key in seen:
                continue
            seen.add(key)
            merged.append(hit)
        return merged
