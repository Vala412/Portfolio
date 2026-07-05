"""Portfolio document ingestion → dense + sparse Pinecone indexes.

Reads markdown, chunks it, then writes each chunk to BOTH:
- the dense index (OpenAI embedding + metadata), and
- the integrated sparse index (raw text; Pinecone embeds it server-side).

Idempotent: chunk ids are deterministic (`<file>_<chunk_id>`), so re-running
upserts in place rather than duplicating.
"""

import glob
import json
from pathlib import Path
from typing import Any, Dict, List

from pinecone import Pinecone

from app.core.config import Settings
from app.core.logging import get_logger
from app.llm.client import build_async_openai
from app.rag.chunker import Chunker
from app.rag.dense_index import DenseIndex
from app.rag.document_reader import DocumentReader
from app.rag.embedder import DenseEmbedder
from app.rag.sparse_index import SparseIndex

logger = get_logger(__name__)


class IngestionPipeline:
    """Reads, chunks, embeds, and upserts portfolio docs into both indexes."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.data_dir = settings.resolved_data_dir()
        self.chunks_cache_path = settings.resolved_chunks_cache_path()

    def _markdown_files(self) -> List[Path]:
        return [Path(p) for p in sorted(glob.glob(str(self.data_dir / "*.md")))]

    def _read_and_chunk(self) -> List[Dict[str, Any]]:
        reader = DocumentReader()
        chunker = Chunker(
            chunk_size=self.settings.chunk_size,
            overlap=self.settings.chunk_overlap,
        )
        all_chunks: List[Dict[str, Any]] = []
        for path in self._markdown_files():
            text = reader.read(str(path))
            chunks = chunker.chunk(text)
            for chunk in chunks:
                all_chunks.append({
                    "id": f"{path.name}_{chunk['chunk_id']}",
                    "source": path.name,
                    "chunk_id": chunk["chunk_id"],
                    "text": chunk["text"],
                    "char_count": chunk["char_count"],
                })
            logger.info("Chunked %s into %d chunks", path.name, len(chunks))
        return all_chunks

    async def run(self) -> Dict[str, Any]:
        logger.info("Starting ingestion (dense + sparse)")
        files = self._markdown_files()
        if not files:
            raise RuntimeError(f"No .md files found in {self.data_dir}")

        chunks = self._read_and_chunk()
        if not chunks:
            raise RuntimeError("No chunks produced from portfolio documents")

        pc = Pinecone(api_key=self.settings.pinecone_api_key)
        dense = DenseIndex(pc, self.settings)
        sparse = SparseIndex(pc, self.settings)
        dense.ensure_index()
        sparse.ensure_index()

        # --- dense: embed then upsert vectors ---
        client = build_async_openai(self.settings)
        try:
            embeddings = await DenseEmbedder(client, self.settings).embed(
                [c["text"] for c in chunks]
            )
        finally:
            await client.close()

        dense_vectors = [
            {
                "id": c["id"],
                "values": embeddings[i],
                "metadata": {
                    "text": c["text"],
                    "source": c["source"],
                    "chunk_id": c["chunk_id"],
                },
            }
            for i, c in enumerate(chunks)
        ]
        dense_count = dense.upsert(dense_vectors)
        logger.info("Upserted %d dense vectors", dense_count)

        # --- sparse: integrated records (Pinecone embeds text) ---
        text_field = self.settings.pinecone_text_field
        sparse_records = [
            {"_id": c["id"], text_field: c["text"], "source": c["source"]}
            for c in chunks
        ]
        sparse_count = sparse.upsert_records(sparse_records)
        logger.info("Upserted %d sparse records", sparse_count)

        # --- debug cache (optional artifact) ---
        self.chunks_cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.chunks_cache_path.write_text(
            json.dumps(
                [{"id": c["id"], "source": c["source"], "text": c["text"]} for c in chunks],
                ensure_ascii=False, indent=2,
            ),
            encoding="utf-8",
        )

        summary = {
            "files_processed": len(files),
            "chunks": len(chunks),
            "dense_upserted": dense_count,
            "sparse_upserted": sparse_count,
            "dense_index": self.settings.pinecone_dense_index,
            "sparse_index": self.settings.pinecone_sparse_index,
        }
        logger.info("Ingestion complete: %s", summary)
        return summary
