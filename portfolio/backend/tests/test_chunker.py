"""Unit tests for the recursive Chunker."""

import pytest

from app.rag.chunker import Chunker


def test_empty_text_returns_no_chunks():
    assert Chunker().chunk("   ") == []


def test_short_text_is_single_chunk():
    chunks = Chunker(chunk_size=300, overlap=50).chunk("A short paragraph about RAG.")
    assert len(chunks) == 1
    assert chunks[0]["text"].startswith("A short paragraph")
    assert chunks[0]["char_count"] == len(chunks[0]["text"])


def test_long_text_splits_into_multiple_chunks():
    text = "\n\n".join(f"Paragraph {i} " + "word " * 40 for i in range(6))
    chunks = Chunker(chunk_size=200, overlap=30).chunk(text)
    assert len(chunks) > 1
    assert all(c["char_count"] <= 260 for c in chunks)  # size + overlap slack
    assert [c["chunk_id"] for c in chunks] == list(range(len(chunks)))


def test_invalid_params_raise():
    with pytest.raises(ValueError):
        Chunker(chunk_size=0)
    with pytest.raises(ValueError):
        Chunker(chunk_size=100, overlap=100)
