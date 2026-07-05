"""Application container: builds and owns long-lived clients once at startup.

Replaces the old multi-provider ModelRegistry. Exposes a `ready` flag so the
readiness probe reflects real init state instead of failing silently.
"""

from typing import Optional

from openai import AsyncOpenAI
from pinecone import Pinecone

from app.core.config import Settings
from app.core.logging import get_logger
from app.llm.client import build_async_openai
from app.llm.openai_llm import OpenAILLM
from app.rag.dense_index import DenseIndex
from app.rag.embedder import DenseEmbedder
from app.rag.reranker import PineconeReranker
from app.rag.retriever import HybridRetriever
from app.rag.sparse_index import SparseIndex

logger = get_logger(__name__)


class AppContainer:
    """Owns the OpenAI client, hybrid retriever, and LLM for the app lifetime."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.ready = False
        self.status = "initializing"
        self._openai: Optional[AsyncOpenAI] = None
        self.retriever: Optional[HybridRetriever] = None
        self.llm: Optional[OpenAILLM] = None

    def initialize(self) -> None:
        try:
            if not self.settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY is not set")
            if not self.settings.pinecone_api_key:
                raise ValueError("PINECONE_API_KEY is not set")

            self._openai = build_async_openai(self.settings)
            pc = Pinecone(api_key=self.settings.pinecone_api_key)

            dense = DenseIndex(pc, self.settings)
            sparse = SparseIndex(pc, self.settings)
            missing = [
                name
                for name in (self.settings.pinecone_dense_index, self.settings.pinecone_sparse_index)
                if not pc.has_index(name)
            ]
            if missing:
                raise RuntimeError(
                    f"Pinecone index(es) not found: {missing}. Run `python ingest.py` first."
                )

            embedder = DenseEmbedder(self._openai, self.settings)
            reranker = PineconeReranker(pc, self.settings)
            self.retriever = HybridRetriever(self.settings, embedder, dense, sparse, reranker)
            self.llm = OpenAILLM(self._openai, self.settings)

            self.ready = True
            self.status = "ready"
            logger.info(
                "Container ready (model=%s, dense=%s, sparse=%s, rerank=%s)",
                self.settings.openai_model, dense.name, sparse.name,
                self.settings.pinecone_rerank_model,
            )
        except Exception as exc:  # noqa: BLE001 - readiness reflects the failure
            self.ready = False
            self.status = f"init failed: {exc}"
            logger.exception("Container initialization failed")

    async def aclose(self) -> None:
        if self._openai is not None:
            await self._openai.close()
