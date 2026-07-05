"""Per-request context shared across middleware and logging."""

from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
