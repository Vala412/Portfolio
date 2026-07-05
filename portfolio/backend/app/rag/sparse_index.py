"""Pinecone integrated sparse index for keyword/lexical retrieval.

Uses Pinecone's hosted sparse embedding model (`pinecone-sparse-english-v0`):
Pinecone embeds the text server-side at upsert and query time, so we only ever
send/receive plain text. Complements the dense index for hybrid recall.
"""

import asyncio
from typing import Any, Dict, List

from pinecone import Pinecone

from app.core.config import Settings
from app.core.logging import get_logger
from app.rag._util import pget

logger = get_logger(__name__)


class SparseIndex:
    """Manages the integrated sparse index for lexical retrieval."""

    def __init__(self, pc: Pinecone, settings: Settings):
        self.pc = pc
        self.settings = settings
        self.name = settings.pinecone_sparse_index
        self.namespace = settings.pinecone_namespace
        self.text_field = settings.pinecone_text_field
        self._index = None

    def ensure_index(self) -> None:
        """Create the integrated sparse index (hosted embedding) if missing."""
        if not self.pc.has_index(self.name):
            logger.info(
                "Creating sparse index '%s' (model=%s)",
                self.name, self.settings.pinecone_sparse_model,
            )
            self.pc.create_index_for_model(
                name=self.name,
                cloud=self.settings.pinecone_cloud,
                region=self.settings.pinecone_region,
                embed={
                    "model": self.settings.pinecone_sparse_model,
                    "field_map": {"text": self.text_field},
                },
            )
        self._index = self.pc.Index(self.name)

    @property
    def index(self):
        if self._index is None:
            self._index = self.pc.Index(self.name)
        return self._index

    def upsert_records(self, records: List[Dict[str, Any]]) -> int:
        """Upsert integrated records; each must have `_id` and the text field."""
        if not records:
            return 0
        self.index.upsert_records(records=records, namespace=self.namespace)
        return len(records)

    async def search(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        resp = await asyncio.to_thread(
            self.index.search,
            namespace=self.namespace,
            query={"inputs": {"text": query}, "top_k": top_k},
        )
        result = pget(resp, "result", {}) or {}
        hits = pget(result, "hits", []) or []
        results: List[Dict[str, Any]] = []
        for h in hits:
            fields = pget(h, "fields", {}) or {}
            results.append({
                "id": pget(h, "_id", ""),
                "text": pget(fields, self.text_field, ""),
                "source": pget(fields, "source", ""),
                "score": float(pget(h, "_score", 0.0) or 0.0),
                "retriever": "sparse",
            })
        return results
