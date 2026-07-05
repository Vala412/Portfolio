"""Pydantic request and response schemas."""

from typing import Optional

from pydantic import BaseModel, Field

from app.core.config import get_settings


class ChatRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=get_settings().request_max_chars,
        description="User question",
    )
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID")


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str


class HealthResponse(BaseModel):
    status: str
    message: str


class ConversationDeleteResponse(BaseModel):
    message: str
