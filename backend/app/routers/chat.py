"""Health chatbot endpoints — FYP requirement."""

# NOTE: deliberately no `from __future__ import annotations` in this module.
# `@limiter.limit` (slowapi) wraps the endpoint, so the wrapper's __globals__
# belong to slowapi, not to this file. With string annotations FastAPI then
# cannot resolve `req: ChatRequest` to a Pydantic model, silently treats it as
# a *query* parameter, and every POST fails with 422 before the handler runs.
# Real annotation objects avoid the lookup entirely. Python 3.11+ supports the
# `X | None` syntax used here natively.

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool
from app.main import limiter
from app.models.schemas import ChatRequest, ChatResponse, ChatSession
from app.services.auth_service import get_current_user_id
from app.services.chatbot_service import chat_with_health_bot
from app.utils.supabase_client import (
    create_chat_session,
    get_chat_sessions,
    get_chat_messages,
    insert_chat_message,
    user_owns_chat_session,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
@limiter.limit("20/minute")
async def send_message(
    request: Request,
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Send a message to the health chatbot.

    Chat history is a convenience, not the feature. If Supabase is unreachable
    or the chat tables are missing, the bot still answers — it just answers
    without saved history rather than failing the whole request.
    """
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    session_id = req.session_id
    persisted = True

    if session_id:
        try:
            if not user_owns_chat_session(session_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found.",
                )
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not verify chat session ownership: %s", exc)
            persisted = False
    else:
        try:
            session = create_chat_session(user_id, title=message[:50])
            session_id = session.get("id")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not create chat session: %s", exc)
            session_id = None

        if not session_id:
            # Keep the conversation usable for this page load even with no DB.
            session_id = str(uuid.uuid4())
            persisted = False

    history: list[dict] = []
    if persisted:
        try:
            history = get_chat_messages(session_id, user_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not load chat history: %s", exc)

        try:
            insert_chat_message(session_id, "user", message)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not save user message: %s", exc)
            persisted = False

    result = await run_in_threadpool(chat_with_health_bot,
        message=message,
        conversation_history=history,
        language=req.language,
    )

    # Only store real answers — don't pollute history with service outages.
    if persisted and result.get("ok"):
        try:
            insert_chat_message(session_id, "assistant", result["reply"])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not save assistant message: %s", exc)

    return ChatResponse(
        session_id=session_id,
        reply=result["reply"],
        doctor_type=result.get("doctor_type"),
        home_remedies=result.get("home_remedies", []),
        ok=bool(result.get("ok", True)),
        error=result.get("error"),
        mode=result.get("mode", "online_ai"),
        notice=result.get("notice"),
        sources=result.get("sources", []),
    )


@router.get("/sessions", response_model=list[ChatSession])
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    """List all chat sessions for the user."""
    try:
        sessions = get_chat_sessions(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not list chat sessions: %s", exc)
        return []

    return [
        ChatSession(
            id=s["id"],
            title=s.get("title", "Chat"),
            created_at=s.get("created_at", ""),
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get all messages in a chat session."""
    try:
        return get_chat_messages(session_id, user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not load chat messages: %s", exc)
        return []
