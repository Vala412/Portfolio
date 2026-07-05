"""Health and metadata routes (liveness + readiness)."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.dependencies import get_container
from app.models import HealthResponse
from app.services.container import AppContainer

router = APIRouter(tags=["health"])


@router.get("/")
async def root() -> dict:
    return {
        "name": "Portfolio RAG Chatbot API",
        "docs": "/docs",
        "health": "/health",
        "ready": "/health/ready",
        "chat": "POST /chat",
        "stream": "POST /chat/stream",
    }


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Liveness: the process is up and serving."""
    return HealthResponse(status="ok", message="Portfolio chatbot is running")


@router.get("/health/ready")
async def readiness(container: AppContainer = Depends(get_container)) -> JSONResponse:
    """Readiness: dependencies initialized (OpenAI + Pinecone indexes present)."""
    code = 200 if container.ready else 503
    return JSONResponse(
        status_code=code,
        content={"ready": container.ready, "status": container.status},
    )
