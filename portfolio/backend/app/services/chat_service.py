"""Chat orchestration: hybrid retrieval → OpenAI generation (blocking + streaming)."""

from typing import AsyncIterator, Optional, Tuple

from app.core.config import Settings
from app.core.errors import ChatProcessingError, RateLimitExceededError, ServiceUnavailableError
from app.core.logging import get_logger
from app.repositories.conversation_store import InMemoryConversationStore
from app.services.container import AppContainer

logger = get_logger(__name__)


class ChatService:
    """Coordinates conversation state, retrieval, and answer generation."""

    def __init__(
        self,
        settings: Settings,
        container: AppContainer,
        conversation_store: InMemoryConversationStore,
    ):
        self.settings = settings
        self.container = container
        self.conversation_store = conversation_store

    def _require_ready(self) -> None:
        if not self.container.ready:
            raise ServiceUnavailableError(
                "Backend is not ready. Check config and that ingestion has run."
            )

    async def answer(self, query: str, conversation_id: Optional[str] = None) -> Tuple[str, str]:
        clean_query = query.strip()
        if not clean_query:
            raise ValueError("Query cannot be empty")
        self._require_ready()

        try:
            cid = self.conversation_store.get_or_create(conversation_id)
            history = self.conversation_store.get_history(cid)
            chunks = await self.container.retriever.retrieve(clean_query)
            answer, _usage = await self.container.llm.generate(clean_query, chunks, history)
            self.conversation_store.append_turn(cid, clean_query, answer)
            return answer, cid
        except (ValueError, RateLimitExceededError, ServiceUnavailableError):
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to answer chat request")
            raise ChatProcessingError("Error processing chat request.") from exc

    async def answer_stream(
        self, query: str, conversation_id: Optional[str] = None
    ) -> AsyncIterator[Tuple[str, Optional[str]]]:
        """Yield ('meta', cid) → ('token', delta)* → ('done', None).

        Retrieval runs before the first token; exceptions propagate to the route,
        which converts them into an SSE `error` event.
        """
        clean_query = query.strip()
        if not clean_query:
            raise ValueError("Query cannot be empty")
        self._require_ready()

        cid = self.conversation_store.get_or_create(conversation_id)
        history = self.conversation_store.get_history(cid)
        yield ("meta", cid)

        chunks = await self.container.retriever.retrieve(clean_query)
        parts = []
        async for delta in self.container.llm.stream(clean_query, chunks, history):
            parts.append(delta)
            yield ("token", delta)

        full = "".join(parts).strip()
        if full:
            self.conversation_store.append_turn(cid, clean_query, full)
        yield ("done", None)
