"""Limited, deterministic guidance when the online assistant is unavailable.

This is deliberately identified as basic guidance, not a model-generated answer.
Reference information: NHS headaches, fever in adults, cough, sprains and strains
(reviewed 2026-10-02). No diagnosis, drug doses or claims of normality.
"""
from __future__ import annotations
import re

SOURCES = {
    "headache": "https://www.nhs.uk/symptoms/headaches/",
    "fever": "https://www.nhs.uk/symptoms/fever-in-adults/",
    "cough": "https://www.nhs.uk/symptoms/cough/",
    "injury": "https://www.nhs.uk/conditions/sprains-and-strains/",
}


def basic_health_guidance(message: str, history: list[dict] | None = None, language: str = "en") -> dict:
    current = message.lower().replace("’", "'")
    prior = " ".join(m.get("content", "") for m in (history or [])[-6:] if m.get("role") == "user").lower()
    context = current + " " + prior
    # These alerts are not a complete emergency screening system.
    urgent = any(x in current for x in (
        "can't breathe", "cannot breathe", "difficulty breathing", "struggling to breathe",
        "severe chest pain", "crushing chest pain", "unconscious", "uncontrolled bleeding",
        "sudden weakness", "slurred speech", "worst headache", "sudden severe headache",
        "coughing blood", "coughing up blood", "kill myself", "suicidal",
        "saans nahi", "سانس نہیں", "بے ہوش",
    ))
    source = None
    specialist = "General Physician"
    if urgent:
        reply = ("What you described may need emergency medical attention. Contact local emergency services or go to the nearest emergency department now. "
                 "Ask someone nearby to help you; do not wait for a chat response. This basic guide cannot assess the cause or severity.")
        specialist = "Emergency Department"
    elif re.search(r"\b(baby|infant|child|pregnant|pregnancy)\b|بچہ|حاملہ", context):
        reply = ("Advice for children, babies and pregnancy needs individual assessment. Please contact a qualified clinician and tell them the person's age, symptoms and how long they have lasted. "
                 "If symptoms are severe or worsening, seek urgent care. I cannot safely personalize treatment in basic-guidance mode.")
    elif re.search(r"\b(dose|dosage|medicine|medication|tablet|antibiotic)\b", current):
        reply = ("I cannot choose a medicine or dose for you in basic-guidance mode. A pharmacist or doctor should check your age, allergies, existing conditions and other medicines. "
                 "Tell them your symptoms and how long they have lasted. Do not start prescription medicines based on this chat.")
    elif re.search(r"\b(headache|migraine)\b|sar dard|سر درد", context):
        reply = ("For a mild headache, drinking water, eating regular meals and taking a break from prolonged screen use may help. "
                 "A headache that keeps returning, worsens or does not improve needs a clinician's review. "
                 "A sudden extremely painful headache, new weakness, confusion, vision loss or a headache after a head injury needs emergency assessment. "
                 "How long has it lasted, and is it mild, moderate or severe?")
        source = SOURCES["headache"]
    elif re.search(r"\b(fever|temperature)\b|bukhar|بخار", context):
        reply = ("For an adult with a fever, rest and drink fluids to avoid dehydration. Check the temperature if you have a thermometer. "
                 "A fever that is worsening or not improving needs medical review; severe symptoms need urgent care. "
                 "What is your age, measured temperature and how long have you felt unwell?")
        source = SOURCES["fever"]
    elif re.search(r"\b(cough|cold|sore throat)\b|khansi|کھانسی", context):
        reply = ("Rest and fluids may help with a mild cough. Seek urgent medical advice if you have chest pain, trouble breathing, cough up blood or feel very unwell. "
                 "A cough lasting more than three weeks should be checked by a clinician. How long have you had the cough, and do you have fever or breathing difficulty?")
        source = SOURCES["cough"]
    elif re.search(r"\b(fracture|sprain|injury|injured|broken|swelling)\b", context):
        reply = ("Pain or swelling after an injury can have several causes; this chat cannot distinguish a sprain from a fracture. "
                 "Avoid activities that worsen the pain and arrange clinical assessment, especially if you cannot bear weight or use the limb. "
                 "Deformity, numbness or a cold/blue limb needs urgent assessment. Which area was injured, and how did it happen?")
        specialist = "Orthopedic Surgeon"
        source = SOURCES["injury"]
    elif re.search(r"\b(diet|meal|food)\b", current):
        reply = ("Open Diet Planner from the sidebar for your meal plan. For a health question, tell me your main symptom, how long it has lasted and your age. "
                 "Basic guidance cannot diagnose a condition or replace advice from your clinician.")
    elif re.search(r"\b(hello|hi|hey|help|questions)\b|salam|سلام", current):
        reply = ("Hello! I can provide basic information about headaches, adult fever, coughs and injuries, and suggest when to seek medical help. "
                 "Tell me your age, main symptom and how long it has lasted. I am a basic guidance assistant, not a doctor, and cannot diagnose or prescribe.")
        specialist = None
    else:
        reply = ("I have your message, but this basic guide cannot assess that concern reliably. Please tell a qualified clinician your main symptom, when it started, "
                 "how severe it is, and any existing conditions or medicines. If symptoms are severe or worsening, seek urgent care. "
                 "For nearby care, open Clinics from the sidebar.")
    if language == "ur":
        # Do not present an English response as an Urdu model completion.
        reply = ("آن لائن AI اسسٹنٹ دستیاب نہیں ہے؛ یہ صرف بنیادی رہنمائی ہے۔ "
                 + ("آپ کی بیان کردہ علامات پر فوری طبی مدد لیں۔ قریبی ایمرجنسی جائیں اور چیٹ کا انتظار نہ کریں۔" if urgent else
                    "اپنی عمر، علامات، شدت اور دورانیہ کسی مستند ڈاکٹر کو بتائیں۔ شدید یا بڑھتی ہوئی تکلیف پر فوری طبی معائنہ کرائیں۔ قریبی علاج کے لیے Clinics کھولیں۔"))
        source = None
    return {"reply": reply, "doctor_type": specialist, "home_remedies": [], "ok": True,
            "mode": "basic_guidance", "notice": "Basic guidance mode — the online AI assistant is unavailable. Responses are limited, prewritten health information.",
            "sources": [source] if source else []}
