"""Pinecone hosted cross-encoder reranking (two-stage retrieval).

The reranker scores each candidate against the query with a cross-encoder,
producing a single unified relevance score. This both refines precision and
resolves the dense-vs-sparse score-scale mismatch, so hybrid candidates don't
need manual weight tuning. Model default: `bge-reranker-v2-m3`.
"""

import asyncio
from typing import Any, Dict, List

from pinecone import Pinecone

from app.core.config import Settings
from app.core.logging import get_logger
from app.rag._util import pget

logger = get_logger(__name__)


class PineconeReranker:
    """Reranks candidate chunks via Pinecone Inference."""

    def __init__(self, pc: Pinecone, settings: Settings):
        self.pc = pc
        self.model = settings.pinecone_rerank_model

    async def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_n: int,
    ) -> List[Dict[str, Any]]:
        """Return the top-N candidates reordered by cross-encoder relevance."""
        if not candidates:
            return []
        documents = [{"text": c.get("text", "")} for c in candidates]
        try:
            result = await asyncio.to_thread(
                self.pc.inference.rerank,
                model=self.model,
                query=query,
                documents=documents,
                rank_fields=["text"],
                top_n=min(top_n, len(documents)),
                return_documents=False,
            )
        except Exception as exc:  # reranking is a refinement — degrade gracefully
            logger.warning("Rerank failed (%s); falling back to pre-rerank order", exc)
            return candidates[:top_n]

        ranked: List[Dict[str, Any]] = []
        for item in pget(result, "data", []) or []:
            idx = pget(item, "index")
            if idx is None or idx >= len(candidates):
                continue
            chunk = dict(candidates[idx])
            chunk["score"] = float(pget(item, "score", 0.0) or 0.0)
            chunk["reranked"] = True
            ranked.append(chunk)
        return ranked or candidates[:top_n]
