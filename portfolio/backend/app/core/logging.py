"""Logging setup for the backend (with per-request correlation id)."""

import logging
from logging.config import dictConfig

from app.core.config import Settings
from app.core.context import request_id_var


class RequestIdFilter(logging.Filter):
    """Injects the current request id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging(settings: Settings) -> None:
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {
                "request_id": {"()": "app.core.logging.RequestIdFilter"},
            },
            "formatters": {
                "standard": {
                    "format": "%(asctime)s %(levelname)s [%(name)s] [%(request_id)s] %(message)s",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "filters": ["request_id"],
                }
            },
            "root": {
                "handlers": ["console"],
                "level": settings.log_level.upper(),
            },
        }
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
