"""Request-context + access-logging middleware."""

import time
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.context import request_id_var
from app.core.logging import get_logger

logger = get_logger("app.access")

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assigns a request id, logs each request with latency, echoes the id."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid4().hex[:12]
        token = request_id_var.set(request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed = (time.perf_counter() - start) * 1000
            logger.exception("%s %s -> 500 (%.1fms)", request.method, request.url.path, elapsed)
            raise
        finally:
            request_id_var.reset(token)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info("%s %s -> %d (%.1fms)", request.method, request.url.path, response.status_code, elapsed)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
