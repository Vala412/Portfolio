"""Application exception types and FastAPI handlers."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


class ServiceUnavailableError(RuntimeError):
    """Raised when a required backend service has not initialized."""


class ChatProcessingError(RuntimeError):
    """Raised when chat orchestration fails."""


class RateLimitExceededError(RuntimeError):
    """Raised when an external service rejects requests due to quota limits."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None):
        super().__init__(message)
        self.retry_after = retry_after


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ServiceUnavailableError)
    async def service_unavailable_handler(
        request: Request, exc: ServiceUnavailableError
    ) -> JSONResponse:
        logger.warning("Service unavailable for %s: %s", request.url.path, exc)
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.exception_handler(ChatProcessingError)
    async def chat_processing_handler(
        request: Request, exc: ChatProcessingError
    ) -> JSONResponse:
        logger.exception("Chat processing failed for %s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Error processing chat request."},
        )

    @app.exception_handler(RateLimitExceededError)
    async def rate_limit_handler(
        request: Request, exc: RateLimitExceededError
    ) -> JSONResponse:
        logger.warning("Rate limit exceeded for %s: %s", request.url.path, exc)
        headers = {}
        if exc.retry_after is not None:
            headers["Retry-After"] = str(exc.retry_after)
        return JSONResponse(
            status_code=429,
            content={"detail": str(exc)},
            headers=headers,
        )
