"""Health chatbot service powered by OpenRouter.

FYP requirement: General doctor bot for health queries, symptom analysis,
home remedies, doctor type recommendation, and multilingual support.

The bot answers in plain, everyday language for a Pakistani audience — no
clinical jargon the average user would not recognise.
"""

from __future__ import annotations

import logging

from app.config import get_settings
from app.services.openrouter_client import OpenRouterError, complete_chat
from app.services.basic_health_guidance import basic_health_guidance

logger = logging.getLogger(__name__)


SYSTEM_PROMPT_EN = """You are the XRayVision AI Health Assistant — a knowledgeable, empathetic medical chatbot for users in Pakistan.

You help patients with:
1. Symptom analysis and possible conditions
2. Basic home remedies and first-aid guidance
3. Doctor type recommendations (which specialist to see)
4. General health and disease information
5. When to seek emergency medical care

IMPORTANT RULES:
- Always remind users that you are an AI assistant, not a real doctor.
- For serious symptoms, ALWAYS recommend visiting a hospital.
- Be empathetic and clear in your responses.
- If asked about medications, suggest consulting a pharmacist or doctor.
- Keep responses short and simple: 2-4 short paragraphs at most.
- Answer the latest question directly and use previous turns only as context.
- If the user changes topic, address the new topic. Do not repeat a previous answer.
- Ask one relevant follow-up question when information needed for safe advice is missing.

LANGUAGE RULES:
- Write in simple, everyday English that someone with no medical background understands.
- Avoid medical jargon. If you must use a medical term, explain it in brackets right after.
- When you mention food, use everyday Pakistani household items — egg, roti, bread, rice,
  daal, yogurt (dahi), banana, milk, chicken soup, tea — not foreign or unfamiliar ingredients.

Respond in a structured, helpful manner.
"""

SYSTEM_PROMPT_UR = """آپ XRayVision AI ہیلتھ اسسٹنٹ ہیں — پاکستانی صارفین کے لیے ایک ذہین اور ہمدرد طبی چیٹ بوٹ۔

آپ مریضوں کی مدد کرتے ہیں:
1. علامات کا تجزیہ اور ممکنہ بیماریاں
2. بنیادی گھریلو علاج اور فرسٹ ایڈ
3. ڈاکٹر کی سفارش (کس ماہر سے ملیں)
4. عام صحت اور بیماریوں کی معلومات
5. کب ایمرجنسی میں جانا چاہیے

اہم قواعد:
- ہمیشہ یاد دلائیں کہ آپ AI اسسٹنٹ ہیں، حقیقی ڈاکٹر نہیں۔
- سنگین علامات کے لیے ہمیشہ ہسپتال جانے کی سفارش کریں۔
- جواب مختصر رکھیں — زیادہ سے زیادہ 2 سے 4 چھوٹے پیراگراف۔
- تازہ سوال کا براہ راست جواب دیں، پچھلے پیغامات صرف سیاق و سباق کے لیے استعمال کریں۔
- موضوع بدلنے پر نئے موضوع کا جواب دیں؛ پچھلا جواب نہ دہرائیں۔
- محفوظ رہنمائی کے لیے ضروری معلومات کم ہوں تو ایک متعلقہ سوال پوچھیں۔

زبان کے قواعد:
- ہمیشہ صاف اور آسان اردو میں جواب دیں، ایسی اردو جو ہر عام آدمی سمجھ سکے۔
- مشکل طبی اصطلاحات استعمال نہ کریں۔ اگر ضروری ہو تو بریکٹ میں آسان لفظوں میں سمجھائیں۔
- کھانے کی بات کریں تو عام پاکستانی گھریلو چیزیں بتائیں — انڈا، روٹی، ڈبل روٹی، چاول، دال،
  دہی، کیلا، دودھ، یخنی، چائے — باہر کی یا انجان چیزیں نہ بتائیں۔
"""

# The markers stay in English so parsing works in both languages; only the
# values after the colon are translated.
OUTPUT_FORMAT_EN = """
At the very end of your reply, on their own separate lines, add exactly:
DOCTOR_TYPE: <the specialist to see, or the word none>
HOME_REMEDIES: <simple remedies separated by commas, or the word none>
"""

OUTPUT_FORMAT_UR = """
اپنے جواب کے بالکل آخر میں، الگ الگ سطروں میں، بالکل یہ لکھیں
(لیبل انگریزی میں رکھیں، تفصیل اردو میں لکھیں):
DOCTOR_TYPE: <کس ماہر ڈاکٹر سے ملنا ہے، یا لفظ none>
HOME_REMEDIES: <آسان گھریلو علاج، کوما سے الگ کر کے، یا لفظ none>
"""

FALLBACK_REPLY_EN = (
    "Sorry — I could not reach the AI service just now. "
    "Please try again in a moment. If your symptoms are severe or getting worse, "
    "do not wait for this chat: contact a doctor or go to the nearest hospital."
)

FALLBACK_REPLY_UR = (
    "معذرت — میں ابھی AI سروس سے رابطہ نہیں کر سکا۔ "
    "براہ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔ اگر آپ کی تکلیف شدید ہے یا بڑھ رہی ہے "
    "تو اس چیٹ کا انتظار نہ کریں — فوراً ڈاکٹر سے رابطہ کریں یا قریبی ہسپتال جائیں۔"
)


def chat_with_health_bot(
    message: str,
    conversation_history: list[dict] | None = None,
    language: str = "en",
) -> dict:
    """Process a health query and return an AI response.

    Args:
        message: The user's message.
        conversation_history: Previous messages for context.
        language: "en" for English, "ur" for Urdu.

    Returns:
        Dict with reply, doctor_type, home_remedies, and an `ok` flag that is
        False when the AI service could not be reached.
    """
    urdu = language == "ur"
    original_message = message
    system_prompt = SYSTEM_PROMPT_UR if urdu else SYSTEM_PROMPT_EN
    output_format = OUTPUT_FORMAT_UR if urdu else OUTPUT_FORMAT_EN

    # Real chat roles instead of one flattened prompt — this is what the model
    # is trained on, and it keeps the system rules from being ignored.
    messages: list[dict] = [{"role": "system", "content": system_prompt + output_format}]

    for msg in (conversation_history or [])[-10:]:
        role = "user" if msg.get("role") == "user" else "assistant"
        content = (msg.get("content") or "").strip()
        if content:
            messages.append({"role": role, "content": content})

    if urdu:
        # Repeated next to the user's turn because a long history can otherwise
        # pull the model back into English.
        message = f"{message}\n\n(اہم: پورا جواب صرف اردو میں دیں۔)"

    messages.append({"role": "user", "content": message})

    try:
        settings = get_settings()
        # See openrouter_agent.py for why `reasoning: exclude` matters here —
        # same JSON-parsing risk if GLM's chain of thought eats the token
        # budget before it reaches the actual structured reply.
        response_text = complete_chat(
            messages, temperature=0.35, max_tokens=1200,
            reasoning={"effort": "low", "exclude": True},
            api_key=settings.health_chat_api_key or None,
            models=[settings.health_chat_model],
        )
    except OpenRouterError as exc:
        logger.error("Chatbot unavailable: %s", exc)
        return basic_health_guidance(original_message, conversation_history, language)
    except Exception as exc:  # noqa: BLE001 - never let the chat route 500
        logger.exception("Unexpected chatbot error: %s", exc)
        return {
            "reply": FALLBACK_REPLY_UR if urdu else FALLBACK_REPLY_EN,
            "doctor_type": None,
            "home_remedies": [],
            "ok": False,
            "error": "The AI service is unavailable right now.",
        }

    parsed = _parse_chat_response(response_text)
    parsed["ok"] = True
    parsed["mode"] = "online_ai"
    return parsed


def _parse_chat_response(text: str) -> dict:
    """Parse the chat response to extract doctor type and remedies."""
    lines = text.strip().split("\n")
    reply_lines = []
    doctor_type = None
    home_remedies: list[str] = []

    for line in lines:
        stripped = line.strip().lstrip("*# ").strip()
        upper = stripped.upper()

        if upper.startswith("DOCTOR_TYPE:"):
            val = stripped.split(":", 1)[1].strip().strip("*_ ")
            doctor_type = val if val.lower() not in ("none", "") else None
        elif upper.startswith("HOME_REMEDIES:"):
            val = stripped.split(":", 1)[1].strip().strip("*_ ")
            if val.lower() not in ("none", ""):
                home_remedies = [r.strip() for r in val.split(",") if r.strip()]
        else:
            reply_lines.append(line)

    reply = "\n".join(reply_lines).strip()

    # If the model emitted nothing but the markers, still show something.
    if not reply:
        reply = text.strip()

    return {
        "reply": reply,
        "doctor_type": doctor_type,
        "home_remedies": home_remedies,
    }
