"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Send, Loader, HelpCircle, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const FAQ_GROUPS = [
  {
    group: "Understanding Scores",
    items: [
      { q: "What is a fraud score?", a: "Your fraud score tells you how likely it is that a transaction is fraudulent. A score from 0–40 is low risk (green), 40–70 is medium risk (yellow), and 70–100 is high risk (red). The higher the number, the more suspicious the transaction looks to our system." },
      { q: "What is a risk score?", a: "Your risk score measures how risky it is to lend money to you based on your financial profile. A low risk score means you are considered a reliable borrower. A high risk score means lenders may need more information before approving a loan or credit." },
      { q: "How accurate is the system?", a: "Our system is designed to minimise false alarms while catching real fraud. However, no system is perfect. That is why every high-risk case is reviewed by a human analyst who can override the automated decision." },
    ],
  },
  {
    group: "Flags & Cases",
    items: [
      { q: "Why was my transaction flagged?", a: "Your transaction was flagged because our system noticed unusual activity. This can happen when you use a new device, pay at a new merchant, travel to a new location, or make several payments in a short time. Being flagged does not mean fraud was confirmed — it means a human analyst will review it." },
      { q: "What does high risk mean?", a: "High risk means our system found strong signals that a transaction or credit profile needs extra attention. For fraud, it means the transaction looks very unusual. For credit risk, it means there may be concerns about repayment ability. A human analyst will always review high-risk cases." },
      { q: "What is a case?", a: "A case is created when a transaction is flagged as high risk. It enters a queue where a trained analyst reviews it. The analyst can clear the transaction, escalate it for further review, or block it to protect you." },
      { q: "What does escalated mean?", a: "Escalated means a human analyst reviewed your case and decided it needs senior attention or a compliance review. This usually happens for very high-risk transactions or unusual patterns that require expert judgment." },
    ],
  },
  {
    group: "Taking Action",
    items: [
      { q: "How do I dispute a flag?", a: "If you believe a transaction was incorrectly flagged, you can contact our support team. An analyst will review the case and update the decision. You can also add notes to explain the context of the transaction." },
      { q: "What are reason codes?", a: "Reason codes are short labels that explain why a transaction or profile was flagged. For example, 'New device' means you used a device we have not seen before. 'High velocity' means many transactions happened in a short time. These codes help analysts and customers understand the exact reasons behind a flag." },
      { q: "How is my data used?", a: "Your transaction and financial data is used only to calculate fraud and risk scores. It is not shared with third parties. All analysis is done to protect you from fraud and to help lenders make fair decisions." },
    ],
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I am here to help you understand your fraud and risk reports in plain, simple language. You can type a question below or browse the frequently asked questions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(FAQ_GROUPS[0].group);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/accessibility/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), context_type: "general" }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: data.answer ?? "I could not find an answer. Please try rephrasing your question." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Help Assistant"
        description="Ask questions about your reports in plain language."
      />

      <div className="grid md:grid-cols-5 gap-5">
        {/* FAQ Sidebar */}
        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={14} className="text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frequently Asked Questions</p>
          </div>

          {FAQ_GROUPS.map(({ group, items }) => (
            <div key={group} className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenGroup(openGroup === group ? null : group)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition"
                aria-expanded={openGroup === group}
              >
                <p className="text-xs font-medium text-foreground">{group}</p>
                {openGroup === group ? (
                  <ChevronDown size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground" />
                )}
              </button>

              {openGroup === group && (
                <div className="border-t border-border divide-y divide-border">
                  {items.map(({ q }) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="md:col-span-3 bg-card border border-border rounded-lg flex flex-col" style={{ minHeight: "520px" }}>
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">FinTech Help Assistant</p>
              <p className="text-xs text-muted-foreground">Plain-language explanations for everyone</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground"
                )}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="mr-auto bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                <Loader size={13} className="animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2 px-4 py-4 border-t border-border"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your reports..."
              className="flex-1 bg-muted border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Type your question"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex items-center justify-center w-10 h-10 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shrink-0"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
