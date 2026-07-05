"""Conversation history persistence abstractions."""

from typing import Dict, List, Optional
from uuid import uuid4


Message = Dict[str, str]


class InMemoryConversationStore:
    """Small in-memory conversation store.

    Swap this with Redis or database-backed storage when multiple workers or
    long-lived conversation persistence are required.
    """

    def __init__(self, max_history_pairs: int):
        self.max_history_pairs = max_history_pairs
        self._store: Dict[str, List[Message]] = {}

    def get_or_create(self, conversation_id: Optional[str]) -> str:
        if conversation_id and conversation_id in self._store:
            return conversation_id

        new_id = str(uuid4())
        self._store[new_id] = []
        return new_id

    def get_history(self, conversation_id: str) -> List[Message]:
        return list(self._store.get(conversation_id, []))

    def append_turn(self, conversation_id: str, query: str, answer: str) -> None:
        history = self._store.setdefault(conversation_id, [])
        history.append({"role": "user", "content": query})
        history.append({"role": "assistant", "content": answer})
        self._store[conversation_id] = self._trim(history)

    def delete(self, conversation_id: str) -> bool:
        return self._store.pop(conversation_id, None) is not None

    def _trim(self, history: List[Message]) -> List[Message]:
        max_messages = self.max_history_pairs * 2
        return history[-max_messages:] if len(history) > max_messages else history
