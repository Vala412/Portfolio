"""Chat and conversation routes: blocking JSON + streaming SSE."""

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from app.api.dependencies import get_chat_service
from app.core.errors import RateLimitExceededError, ServiceUnavailableError
from app.core.logging import get_logger
from app.core.ratelimit import limiter, rate_limit
from app.models import ChatRequest, ChatResponse, ConversationDeleteResponse
from app.services.chat_service import ChatService

logger = get_logger(__name__)
router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(rate_limit)
async def chat(
    request: Request,
    body: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
) -> ChatResponse:
    try:
        answer, conversation_id = await chat_service.answer(
            query=body.query,
            conversation_id=body.conversation_id,
        )
        return ChatResponse(answer=answer, conversation_id=conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/chat/stream")
@limiter.limit(rate_limit)
async def chat_stream(
    request: Request,
    body: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
) -> EventSourceResponse:
    """Stream the answer over SSE.

    Events: `meta` {conversation_id} → `sources` {chunks} → `token` {t} … →
    `done` {} (or `error`). All payloads are JSON so token text with newlines
    is transported safely.
    """

    async def event_generator():
        try:
            async for kind, payload in chat_service.answer_stream(
                query=body.query, conversation_id=body.conversation_id
            ):
                if kind == "meta":
                    yield {"event": "meta", "data": json.dumps({"conversation_id": payload})}
                elif kind == "sources":
                    yield {"event": "sources", "data": json.dumps({"chunks": payload})}
                elif kind == "token":
                    yield {"event": "token", "data": json.dumps({"t": payload})}
                elif kind == "done":
                    yield {"event": "done", "data": "{}"}
        except (ValueError, RateLimitExceededError, ServiceUnavailableError) as exc:
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}
        except Exception:  # noqa: BLE001
            logger.exception("Streaming chat failed")
            yield {"event": "error", "data": json.dumps({"detail": "Error processing chat request."})}

    return EventSourceResponse(event_generator())


@router.delete(
    "/conversation/{conversation_id}",
    response_model=ConversationDeleteResponse,
)
async def delete_conversation(
    conversation_id: str,
    chat_service: ChatService = Depends(get_chat_service),
) -> ConversationDeleteResponse:
    deleted = chat_service.conversation_store.delete(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Conversation '{conversation_id}' not found")
    return ConversationDeleteResponse(message="Conversation cleared")
