"""OpenRouter chat-completions client.

The app runs on OpenRouter's free model tier, which is rate limited per day and
occasionally retires model IDs. A single failed call used to take down both the
health chatbot and the diet planner, so this client:

* sends a list of models so OpenRouter can fall back automatically,
* retries 429 / 5xx responses with backoff, honouring ``Retry-After``,
* raises :class:`OpenRouterError` with a message that is safe to show a user.
"""

from __future__ import annotations

import logging
import re
import time

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

MAX_ATTEMPTS = 3
BACKOFF_SECONDS = (1.0, 3.0)
RETRYABLE_STATUS = {408, 409, 429, 500, 502, 503, 504}

# OpenRouter rejects the request outright with
# "'models' array must have 3 items or fewer." past this, so the chain is
# truncated rather than allowed to fail every call.
MAX_MODELS = 3


class OpenRouterError(RuntimeError):
    """Raised when OpenRouter cannot produce a completion.

    ``user_message`` is phrased for display in the UI; ``str(exc)`` keeps the
    technical detail for the logs.
    """

    def __init__(self, detail: str, user_message: str, *, status_code: int | None = None):
        super().__init__(detail)
        self.user_message = user_message
        self.status_code = status_code


def _model_candidates() -> list[str]:
    """Primary model first, then any configured fallbacks, de-duplicated."""
    settings = get_settings()
    candidates = [settings.openrouter_model.strip()]
    candidates += [m.strip() for m in settings.openrouter_fallback_models.split(",")]

    ordered: list[str] = []
    for model in candidates:
        if model and model not in ordered:
            ordered.append(model)
    return ordered[:MAX_MODELS]


def _retry_after_seconds(response: httpx.Response, attempt: int) -> float:
    header = response.headers.get("Retry-After")
    if header:
        try:
            # Cap it so a long provider cooldown never stalls a web request.
            return min(float(header), 10.0)
        except ValueError:
            pass
    return BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)]


def _extract_content(data: dict, *, final_answer_only: bool = False) -> str:
    choices = data.get("choices") or []
    if not choices:
        return ""

    message = choices[0].get("message") or {}
    content = message.get("content")

    # Some providers return the text as a list of content parts.
    if isinstance(content, list):
        content = "".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict)
        )

    if isinstance(content, str) and content.strip():
        if final_answer_only:
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE).strip()
            if re.match(r"(?:<think>|here['’]s (?:a|my|the) thinking process|(?:analysis|reasoning)\s*:)", content, re.IGNORECASE):
                return ""
        return content

    # Legacy structured callers retain their behavior. Health Chat requires an
    # actual final answer; provider reasoning must never become the user reply.
    reasoning = message.get("reasoning")
    if not final_answer_only and isinstance(reasoning, str) and reasoning.strip():
        return reasoning

    return ""


def complete_chat(
    messages: list[dict],
    *,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    reasoning: dict | None = None,
    api_key: str | None = None,
    models: list[str] | None = None,
    final_answer_only: bool = False,
) -> str:
    """Send a list of role/content messages and return the assistant text.

    `reasoning` maps to OpenRouter's reasoning controls. The free tier routes to
    reasoning models (a live run landed on nemotron, which spent 2087 of 3000
    tokens thinking and truncated the answer), so callers that need a long,
    complete answer should turn reasoning down and raise `max_tokens`.
    """
    settings = get_settings()
    configured_key = api_key or settings.openrouter_api_key
    if not configured_key:
        raise OpenRouterError(
            "OPENROUTER_API_KEY is not configured.",
            "The AI service is not configured yet. Please add an OpenRouter API key.",
        )

    models = (models or _model_candidates())[:MAX_MODELS]
    payload: dict = {
        "model": models[0],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if len(models) > 1:
        # OpenRouter tries each model in order when the earlier ones fail.
        payload["models"] = models
    if reasoning:
        payload["reasoning"] = reasoning

    headers = {
        "Authorization": f"Bearer {configured_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url,
        "X-Title": settings.openrouter_app_name,
    }

    last_error: OpenRouterError | None = None

    for attempt in range(MAX_ATTEMPTS):
        attempt_payload = dict(payload)
        if final_answer_only:
            # Health Chat must actually reach its backup after a provider pool
            # limit or an empty final answer. Production returned the same 429
            # three times despite the models array, so select each retry here.
            attempt_payload["model"] = models[min(attempt, len(models) - 1)]
            attempt_payload.pop("models", None)
        try:
            response = httpx.post(
                OPENROUTER_URL,
                headers=headers,
                json=attempt_payload,
                timeout=settings.openrouter_timeout_seconds,
            )
        except httpx.RequestError as exc:
            last_error = OpenRouterError(
                f"OpenRouter request error: {exc}",
                "Could not reach the AI service. Please check your connection and try again.",
            )
            logger.warning("OpenRouter attempt %s/%s failed: %s", attempt + 1, MAX_ATTEMPTS, exc)
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)])
            continue

        if response.status_code in RETRYABLE_STATUS:
            detail = response.text[:500]
            if response.status_code == 429:
                user_message = (
                    "The free AI service has hit its usage limit for now. "
                    "Please wait a minute and try again."
                )
            else:
                user_message = "The AI service is busy right now. Please try again in a moment."
            last_error = OpenRouterError(
                f"OpenRouter HTTP {response.status_code}: {detail}",
                user_message,
                status_code=response.status_code,
            )
            logger.warning(
                "OpenRouter attempt %s/%s got HTTP %s: %s",
                attempt + 1, MAX_ATTEMPTS, response.status_code, detail,
            )
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(_retry_after_seconds(response, attempt))
            continue

        if response.status_code >= 400:
            detail = response.text[:500]
            logger.error("OpenRouter HTTP %s: %s", response.status_code, detail)
            if response.status_code in (401, 403):
                user_message = "The AI service rejected the configured API key."
            elif response.status_code == 404:
                user_message = (
                    "The configured AI model is unavailable. "
                    "Please update OPENROUTER_MODEL."
                )
            else:
                user_message = "The AI service returned an error. Please try again."
            raise OpenRouterError(
                f"OpenRouter HTTP {response.status_code}: {detail}",
                user_message,
                status_code=response.status_code,
            )

        data = response.json()

        # OpenRouter can return HTTP 200 with an error body.
        if isinstance(data.get("error"), dict):
            detail = str(data["error"].get("message", "unknown error"))
            last_error = OpenRouterError(
                f"OpenRouter error payload: {detail}",
                "The AI service is unavailable right now. Please try again in a moment.",
            )
            logger.warning("OpenRouter returned an error payload: %s", detail)
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)])
            continue

        content = _extract_content(data, final_answer_only=final_answer_only)
        if content:
            choice = (data.get("choices") or [{}])[0]
            if choice.get("finish_reason") == "length":
                # Not fatal — the caller may still salvage it — but it is the
                # usual reason a long structured answer comes back unparseable.
                usage = data.get("usage") or {}
                logger.warning(
                    "OpenRouter response hit the token limit (model=%s, completion=%s, "
                    "reasoning=%s). The answer is truncated.",
                    data.get("model"),
                    usage.get("completion_tokens"),
                    (usage.get("completion_tokens_details") or {}).get("reasoning_tokens"),
                )
            return content

        last_error = OpenRouterError(
            "OpenRouter returned an empty response.",
            "The AI service returned an empty answer. Please try again.",
        )
        logger.warning("OpenRouter returned an empty completion (model=%s)", data.get("model"))
        if attempt < MAX_ATTEMPTS - 1:
            time.sleep(BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)])

    raise last_error or OpenRouterError(
        "OpenRouter request failed.",
        "The AI service is unavailable right now. Please try again in a moment.",
    )


def complete_text(
    prompt: str,
    *,
    system_prompt: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    reasoning: dict | None = None,
) -> str:
    """Send a single prompt to OpenRouter and return the assistant text."""
    messages: list[dict] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    return complete_chat(
        messages,
        temperature=temperature,
        max_tokens=max_tokens,
        reasoning=reasoning,
    )
