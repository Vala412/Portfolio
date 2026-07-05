"""Small helpers for parsing Pinecone SDK response objects.

Pinecone responses are OpenAPI models that support both attribute and
item access depending on version — `pget` normalizes that.
"""

from typing import Any


def pget(obj: Any, key: str, default: Any = None) -> Any:
    """Fetch `key` from a dict, mapping-like, or attribute-bearing object."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    try:
        return obj[key]
    except (KeyError, TypeError, IndexError):
        pass
    return getattr(obj, key, default)
