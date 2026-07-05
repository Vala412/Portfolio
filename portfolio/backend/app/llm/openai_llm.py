"""OpenAI chat generation (blocking and streaming) grounded in retrieved context.

Design notes:
- The **system prompt is static** across requests (KV-cache friendly on the
  provider side); the per-request retrieved context goes into the user turn.
- Both entry points share one message-builder so blocking and streaming stay
  behaviourally identical.
"""

from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from openai import APIError, APITimeoutError, RateLimitError
from openai import AsyncOpenAI

from app.core.config import Settings
from app.core.errors import RateLimitExceededError
from app.core.logging import get_logger
from app.prompts.prompt import PORTFOLIO_SALES_ASSISTANT_SYSTEM_PROMPT

logger = get_logger(__name__)

# Rough $/1M tokens for usage logging (gpt-5.4-mini). Purely informational.
_COST_PER_1M = {"input": 0.75, "output": 4.50}

_CONTEXT_IN_USER_TURN = (
    "(The retrieved portfolio context for the current question is provided "
    "in the user message.)"
)


class OpenAILLM:
    """Generates answers with an OpenAI chat model, grounded in RAG context."""

    def __init__(self, client: AsyncOpenAI, settings: Settings):
        self.client = client
        self.settings = settings
        self.model = settings.openai_model
        self._system_prompt = PORTFOLIO_SALES_ASSISTANT_SYSTEM_PROMPT.format(
            bot_name=settings.bot_name,
            assistant_name=settings.assistant_name,
            contact_email=settings.contact_email,
            context=_CONTEXT_IN_USER_TURN,
        )

    def _sampling_params(self) -> Dict[str, Any]:
        """Model params shared by generate() and stream().

        Newer OpenAI models require `max_completion_tokens` (not `max_tokens`)
        and only accept the default temperature, so temperature is opt-in.
        """
        params: Dict[str, Any] = {
            "max_completion_tokens": self.settings.openai_max_output_tokens,
        }
        if self.settings.openai_send_temperature:
            params["temperature"] = self.settings.openai_temperature
        return params

    # ---------------------------------------------------------------- prompt
    @staticmethod
    def _format_context(chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return "No relevant context found."
        parts = []
        for i, chunk in enumerate(chunks, start=1):
            source = chunk.get("source") or "unknown"
            parts.append(f"[Rank {i} | Source: {source}]\n{chunk.get('text', '')}")
        return "\n\n---\n\n".join(parts)

    def _build_messages(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]],
    ) -> List[Dict[str, str]]:
        messages: List[Dict[str, str]] = [{"role": "system", "content": self._system_prompt}]
        for turn in history or []:
            role = turn.get("role")
            content = (turn.get("content") or "").strip()
            if content and role in ("user", "assistant"):
                messages.append({"role": role, "content": content})
        # The user turn carries only the per-request context + question. All
        # behavioural instructions live in the (static) system prompt, so we do
        # not repeat them here — repeating them costs ~150 tokens every request
        # and, sitting after the dynamic context, can never be prompt-cached.
        messages.append({
            "role": "user",
            "content": (
                "Retrieved portfolio context:\n"
                f"{self._format_context(context_chunks)}\n\n"
                f"Question: {query.strip()}"
            ),
        })
        return messages

    def _log_usage(self, usage: Any) -> Dict[str, int]:
        if not usage:
            return {}
        pt = getattr(usage, "prompt_tokens", 0) or 0
        ct = getattr(usage, "completion_tokens", 0) or 0
        cost = (pt * _COST_PER_1M["input"] + ct * _COST_PER_1M["output"]) / 1_000_000
        logger.info("openai usage prompt=%d completion=%d est_cost=$%.5f", pt, ct, cost)
        return {"prompt_tokens": pt, "completion_tokens": ct}

    # ---------------------------------------------------------------- generate
    async def generate(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[str, Dict[str, int]]:
        """Return a complete answer plus token-usage stats."""
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        try:
            resp = await self.client.chat.completions.create(
                model=self.model,
                messages=self._build_messages(query, context_chunks, history),
                **self._sampling_params(),
            )
        except RateLimitError as exc:
            raise RateLimitExceededError("OpenAI rate limit exceeded. Please retry shortly.") from exc
        except (APITimeoutError, APIError) as exc:
            raise RuntimeError(f"OpenAI request failed: {exc}") from exc

        answer = (resp.choices[0].message.content or "").strip()
        usage = self._log_usage(getattr(resp, "usage", None))
        if not answer:
            answer = (
                f"I couldn't generate an answer just now — please reach "
                f"{self.settings.assistant_name} at {self.settings.contact_email}."
            )
        return answer, usage

    # ---------------------------------------------------------------- stream
    async def stream(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncIterator[str]:
        """Yield answer text deltas as they arrive from the model."""
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=self._build_messages(query, context_chunks, history),
                stream=True,
                stream_options={"include_usage": True},
                **self._sampling_params(),
            )
            async for chunk in stream:
                if not chunk.choices:
                    if getattr(chunk, "usage", None):
                        self._log_usage(chunk.usage)
                    continue
                delta = chunk.choices[0].delta
                piece = getattr(delta, "content", None)
                if piece:
                    yield piece
        except RateLimitError as exc:
            raise RateLimitExceededError("OpenAI rate limit exceeded. Please retry shortly.") from exc
        except (APITimeoutError, APIError) as exc:
            raise RuntimeError(f"OpenAI streaming failed: {exc}") from exc
