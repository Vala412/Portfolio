"""FastAPI dependency helpers."""

from fastapi import Request

from app.services.chat_service import ChatService
from app.services.container import AppContainer


def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat_service


def get_container(request: Request) -> AppContainer:
    return request.app.state.container
