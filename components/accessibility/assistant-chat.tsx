"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTED_QUESTIONS = [
  "What is a fraud score?",
  "Why was my transaction flagged?",
  "What does high risk mean?",
  "What are reason codes?",
  "How do I dispute a flag?",
  "What is a case?",
];

interface AssistantChatProps {
  contextType?: "fraud" | "risk" | "general";
  contextData?: Record<string, unknown>;
}

export function AssistantChat({ contextType = "general", contextData }: AssistantChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I can help explain your fraud and risk reports in plain language. Ask me anything or choose a question below.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: question.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/accessibility/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context_type: contextType,
          context_data: contextData,
        }),
      });
      const data = await res.json();
      const answer = data.answer ?? "Sorry, I could not find an answer right now. Please try rephrasing your question.";
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open accessibility assistant"}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all",
          open ? "bg-muted border border-border text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {open ? <X size={18} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Accessibility assistant"
          className="fixed bottom-22 right-6 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "480px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/50">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Help Assistant</p>
              <p className="text-xs text-muted-foreground">Ask anything about your reports</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[88%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground"
                )}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="mr-auto bg-muted rounded-lg px-3 py-2">
                <Loader size={12} className="animate-spin text-muted-foreground" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested questions */}
          {messages.length <= 2 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-muted border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 px-3 py-2.5 border-t border-border"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-muted border border-border rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Type your question"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-7 h-7 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shrink-0"
              aria-label="Send"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
