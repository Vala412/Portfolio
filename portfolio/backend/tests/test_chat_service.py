"""ChatService orchestration tests with mocked retriever + LLM (no network)."""

from types import SimpleNamespace

import pytest

from app.core.config import Settings
from app.repositories.conversation_store import InMemoryConversationStore
from app.services.chat_service import ChatService


class FakeRetriever:
    def __init__(self):
        self.last_query = None

    async def retrieve(self, query, top_n=None):
        self.last_query = query
        return [{"id": "about.md_0", "text": "Vatsal builds RAG systems.", "source": "about.md", "score": 0.9}]


class FakeLLM:
    async def generate(self, query, chunks, history=None):
        assert chunks and chunks[0]["source"] == "about.md"
        return "Vatsal builds production RAG systems.", {"prompt_tokens": 10, "completion_tokens": 5}

    async def stream(self, query, chunks, history=None):
        for piece in ["Vatsal ", "builds ", "RAG."]:
            yield piece


def _service(ready=True):
    settings = Settings(_env_file=None)
    container = SimpleNamespace(ready=ready, retriever=FakeRetriever(), llm=FakeLLM())
    store = InMemoryConversationStore(max_history_pairs=5)
    return ChatService(settings=settings, container=container, conversation_store=store), store


async def test_answer_returns_text_and_appends_history():
    service, store = _service()
    answer, cid = await service.answer("What does Vatsal build?")
    assert "RAG" in answer
    assert cid
    history = store.get_history(cid)
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
    assert history[1]["content"] == answer


async def test_answer_rejects_empty_query():
    service, _ = _service()
    with pytest.raises(ValueError):
        await service.answer("   ")


async def test_answer_stream_yields_meta_tokens_done_and_persists():
    service, store = _service()
    events = [item async for item in service.answer_stream("hi")]
    kinds = [k for k, _ in events]
    assert kinds[0] == "meta"
    assert kinds[-1] == "done"
    tokens = "".join(p for k, p in events if k == "token")
    assert tokens == "Vatsal builds RAG."
    cid = events[0][1]
    assert store.get_history(cid)[1]["content"] == "Vatsal builds RAG."


async def test_not_ready_raises_service_unavailable():
    from app.core.errors import ServiceUnavailableError

    service, _ = _service(ready=False)
    with pytest.raises(ServiceUnavailableError):
        await service.answer("hi")
