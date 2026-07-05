"""Application configuration loaded from environment variables.

Single-provider setup: OpenAI for chat + dense embeddings, Pinecone for the
dense/sparse hybrid indexes and hosted reranking. Env matching is
case-insensitive, so `OPENAI_API_KEY` and `OpenAI_API_KEY` both bind here.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Typed runtime settings for the backend."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App metadata ---
    app_name: str = "Portfolio RAG Chatbot API"
    app_description: str = "Production hybrid-RAG assistant for Vatsal Vala's portfolio"
    app_version: str = "2.0.0"
    environment: str = "development"
    log_level: str = "INFO"

    backend_dir: Path = Field(default_factory=lambda: BACKEND_DIR)
    data_dir: Path | None = None
    chunks_cache_path: Path | None = None

    # --- API / security ---
    allowed_origins: str = "*"
    rate_limit: str = "20/minute"
    # History is resent (uncached) on every turn; 3 pairs is ample context for a
    # portfolio Q&A bot while keeping recurring input tokens low.
    max_history_pairs: int = 3
    request_max_chars: int = 2000

    # --- Assistant identity ---
    # `assistant_name` is the portfolio owner (the person). `bot_name` is the
    # chatbot's own name/persona that greets and represents that person.
    assistant_name: str = "Vatsal Vala"
    bot_name: str = "Anvi"
    contact_email: str = "vatsalvala46@gmail.com"

    # --- OpenAI ---
    openai_api_key: str = ""
    openai_model: str = "gpt-5.4-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dim: int = 1536
    # GPT-5.x models fix temperature at the default and reject custom values, so
    # temperature is opt-in (enable only for models that support it, e.g. gpt-4o).
    openai_temperature: float = 1.0
    openai_send_temperature: bool = False
    # Uses `max_completion_tokens`; keep headroom since reasoning-capable models
    # spend part of this budget on internal reasoning tokens.
    openai_max_output_tokens: int = 1500
    openai_timeout_seconds: float = 60.0
    openai_max_retries: int = 3
    openai_embedding_batch_size: int = 64

    # --- Pinecone (dense + sparse + rerank) ---
    pinecone_api_key: str = ""
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"
    pinecone_dense_index: str = "portfolio-dense"
    pinecone_sparse_index: str = "portfolio-sparse"
    pinecone_sparse_model: str = "pinecone-sparse-english-v0"
    pinecone_rerank_model: str = "bge-reranker-v2-m3"
    pinecone_metric: str = "cosine"
    pinecone_namespace: str = "portfolio"
    pinecone_text_field: str = "chunk_text"
    pinecone_upsert_batch_size: int = 96

    # --- Retrieval / chunking ---
    dense_top_k: int = 20
    sparse_top_k: int = 20
    # Chunks sent to the LLM after reranking. 5 keeps grounding strong for a
    # small corpus while trimming per-request context tokens.
    rerank_top_n: int = 5
    chunk_size: int = 300
    chunk_overlap: int = 50

    # --- Derived helpers ---
    def resolved_data_dir(self) -> Path:
        return self.data_dir or self.backend_dir / "data"

    def resolved_chunks_cache_path(self) -> Path:
        return self.chunks_cache_path or self.backend_dir / "chunks_cache.json"

    def cors_allowed_origins(self) -> list[str]:
        origins = [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
        return origins or ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
