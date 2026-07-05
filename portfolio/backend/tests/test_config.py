"""Config parsing tests (case-insensitive env, CORS split)."""

from app.core.config import Settings


def test_env_is_case_insensitive(monkeypatch):
    # Mixed-case env var (as the user's .env used) must still bind.
    monkeypatch.setenv("OpenAI_Model", "gpt-5.4-mini")
    settings = Settings(_env_file=None)
    assert settings.openai_model == "gpt-5.4-mini"


def test_defaults_are_openai_and_hybrid():
    settings = Settings(_env_file=None)
    assert settings.openai_embedding_model == "text-embedding-3-small"
    assert settings.openai_embedding_dim == 1536
    assert settings.pinecone_rerank_model == "bge-reranker-v2-m3"
    assert settings.dense_top_k > 0 and settings.sparse_top_k > 0


def test_cors_split():
    settings = Settings(_env_file=None, allowed_origins="https://a.com, https://b.com")
    assert settings.cors_allowed_origins() == ["https://a.com", "https://b.com"]
