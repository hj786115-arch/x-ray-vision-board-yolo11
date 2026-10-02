import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Home,
  Send,
  Mic,
  MicOff,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useSendMessage } from "@/hooks/use-chat";
import { useLanguage, type StringKey } from "@/lib/i18n";
import type { ChatMessage } from "@/lib/types";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Health Chat — XRayVision AI" }] }),
  component: ChatPage,
});

/** A message plus the UI state the transcript needs to render it. */
type Bubble = ChatMessage & { failed?: boolean; notice?: string | null; sources?: string[] };

const suggestionKeys: { icon: typeof Home; key: StringKey }[] = [
  { icon: Stethoscope, key: "chat.suggest.1" },
  { icon: Home, key: "chat.suggest.2" },
  { icon: UserRound, key: "chat.suggest.3" },
  { icon: Sparkles, key: "chat.suggest.4" },
];

function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { lang, dir, isUrdu, t } = useLanguage();
  const sendMutation = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg || sendMutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLastFailedMessage(null);

    sendMutation.mutate(
      { message: msg, sessionId: sessionId || undefined, language: lang },
      {
        onSuccess: (res) => {
          setSessionId(res.session_id);

          let reply = res.reply;
          if (res.doctor_type) {
            reply += `\n\n${t("chat.specialist")}: ${res.doctor_type}`;
          }
          if (res.home_remedies?.length) {
            reply += `\n\n${t("chat.remedies")}:\n${res.home_remedies.map((r) => `• ${r}`).join("\n")}`;
          }

          // The backend answers with ok:false when the AI service is down, so
          // the failure is visible and retryable instead of looking like a reply.
          const failed = res.ok === false;
          if (failed) setLastFailedMessage(msg);
          setMessages((prev) => [...prev, { role: "assistant", content: reply, failed, notice: res.notice, sources: res.sources }]);
        },
        onError: (err) => {
          setLastFailedMessage(msg);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `${t("chat.unavailable")}\n${err.message}`,
              failed: true,
            },
          ]);
        },
      },
    );
  };

  const handleSend = () => {
    const msg = input;
    setInput("");
    send(msg);
  };

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert(t("chat.voiceUnsupported"));
      return;
    }
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = isUrdu ? "ur-PK" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setLastFailedMessage(null);
  };

  return (
    <AppShell title="Health Chat" titleKey="chat.title">
      <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-4xl flex-col" dir={dir}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">{t("chat.assistant")}</h2>
              <p className="text-xs text-muted-foreground">{t("chat.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus size={14} /> {t("chat.newChat")}
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4"
          style={{ background: "var(--gradient-card)" }}
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageSquare size={40} className="text-primary/30" />
              <p className="mt-4 font-display text-lg font-bold text-muted-foreground">
                {t("chat.emptyTitle")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("chat.emptyBody")}</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {suggestionKeys.map(({ icon: Icon, key }) => (
                  <button
                    key={key}
                    onClick={() => send(t(key))}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-start text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    <Icon size={14} className="shrink-0 text-primary" />
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : msg.failed
                      ? "rounded-bl-md border border-destructive/40 bg-destructive/10 text-foreground"
                      : "rounded-bl-md border border-border bg-background/80 text-foreground"
                }`}
              >
                {msg.failed && (
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <TriangleAlert size={13} /> {t("chat.unavailable")}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.notice && <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">{msg.notice}</p>}
                {msg.sources?.map((source) => <a key={source} href={source} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-primary underline">Read the NHS reference</a>)}
              </div>
            </div>
          ))}

          {sendMutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-background/80 px-4 py-3 text-sm">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="text-muted-foreground">{t("chat.thinking")}</span>
              </div>
            </div>
          )}

          {lastFailedMessage && !sendMutation.isPending && (
            <div className="flex justify-start">
              <button
                onClick={() => send(lastFailedMessage)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-primary hover:border-primary/40"
              >
                <RotateCcw size={13} /> {t("chat.retry")}
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card/60 p-2">
          <button
            onClick={handleVoice}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              isListening
                ? "bg-destructive/15 text-destructive"
                : "bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isListening ? t("chat.stopVoice") : t("chat.startVoice")}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={t("chat.placeholder")}
            className="flex-1 bg-transparent px-2 text-sm placeholder:text-muted-foreground focus:outline-none"
            dir={dir}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            aria-label={t("chat.send")}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)] disabled:opacity-40"
          >
            <Send size={16} className="rtl-flip" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
