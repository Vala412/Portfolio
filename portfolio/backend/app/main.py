"""FastAPI application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import chat, health
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from app.core.ratelimit import limiter
from app.repositories.conversation_store import InMemoryConversationStore
from app.services.chat_service import ChatService
from app.services.container import AppContainer

settings = get_settings()
configure_logging(settings)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    container = AppContainer(settings=settings)
    conversation_store = InMemoryConversationStore(max_history_pairs=settings.max_history_pairs)

    container.initialize()  # sets container.ready; readiness probe reflects it
    app.state.container = container
    app.state.chat_service = ChatService(
        settings=settings,
        container=container,
        conversation_store=conversation_store,
    )

    yield

    await container.aclose()
    logger.info("Portfolio chatbot backend shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description=settings.app_description,
        version=settings.app_version,
        lifespan=lifespan,
    )

    # rate limiting (slowapi)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # request-id + access logging
    app.add_middleware(RequestContextMiddleware)

    # CORS: no cookies are used, so credentials stay off (safe with "*").
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(chat.router)
    return app


app = create_app()
