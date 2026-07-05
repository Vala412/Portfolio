"""Unit tests for the in-memory conversation store."""

from app.repositories.conversation_store import InMemoryConversationStore


def test_get_or_create_returns_stable_id():
    store = InMemoryConversationStore(max_history_pairs=5)
    cid = store.get_or_create(None)
    assert cid
    assert store.get_or_create(cid) == cid


def test_append_and_history_order():
    store = InMemoryConversationStore(max_history_pairs=5)
    cid = store.get_or_create(None)
    store.append_turn(cid, "hi", "hello")
    history = store.get_history(cid)
    assert history == [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]


def test_history_is_trimmed_to_max_pairs():
    store = InMemoryConversationStore(max_history_pairs=2)
    cid = store.get_or_create(None)
    for i in range(5):
        store.append_turn(cid, f"q{i}", f"a{i}")
    history = store.get_history(cid)
    assert len(history) == 4  # 2 pairs * 2 messages
    assert history[0] == {"role": "user", "content": "q3"}


def test_delete():
    store = InMemoryConversationStore(max_history_pairs=2)
    cid = store.get_or_create(None)
    assert store.delete(cid) is True
    assert store.delete(cid) is False
