import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

// ── Prompt templates ──────────────────────────────────────────────────────────

const FAQ_ANSWERS: Record<string, string> = {
  "what is fraud score":
    "Your fraud score tells you how likely it is that a transaction is fraudulent. A score from 0–40 is low risk (green), 40–70 is medium risk (yellow), and 70–100 is high risk (red). The higher the number, the more suspicious the transaction looks to our system.",
  "what is risk score":
    "Your risk score measures how risky it is to lend money to you based on your financial profile. A low risk score means you are considered a reliable borrower. A high risk score means lenders may need more information before approving a loan or credit.",
  "why was my transaction flagged":
    "Your transaction was flagged because our system noticed unusual activity. This can happen when you use a new device, pay at a new merchant, travel to a new location, or make several payments in a short time. Being flagged does not mean fraud was confirmed — it means a human analyst will review it.",
  "what does high risk mean":
    "High risk means our system found strong signals that a transaction or credit profile needs extra attention. For fraud, it means the transaction looks very unusual. For credit risk, it means there may be concerns about repayment ability. A human analyst will always review high-risk cases.",
  "how do i dispute a flag":
    "If you believe a transaction was incorrectly flagged, you can contact our support team. An analyst will review the case and update the decision. You can also add notes to explain the context of the transaction.",
  "what are reason codes":
    "Reason codes are short labels that explain why a transaction or profile was flagged. For example, 'New device' means you used a device we have not seen before. 'High velocity' means many transactions happened in a short time. These codes help analysts and customers understand the exact reasons behind a flag.",
  "what is a case":
    "A case is created when a transaction is flagged as high risk. It enters a queue where a trained analyst reviews it. The analyst can clear the transaction, escalate it for further review, or block it to protect you.",
  "how is my data used":
    "Your transaction and financial data is used only to calculate fraud and risk scores. It is not shared with third parties. All analysis is done to protect you from fraud and to help lenders make fair decisions.",
  "what does escalated mean":
    "Escalated means a human analyst reviewed your case and decided it needs senior attention or a compliance review. This usually happens for very high-risk transactions or unusual patterns that require expert judgment.",
  "how accurate is the system":
    "Our system is designed to minimise false alarms while catching real fraud. However, no system is perfect. That is why every high-risk case is reviewed by a human analyst who can override the automated decision.",
};

function matchFaq(question: string): string | null {
  const q = question.toLowerCase().trim();
  for (const [key, answer] of Object.entries(FAQ_ANSWERS)) {
    const keywords = key.split(" ");
    const matchCount = keywords.filter((k) => q.includes(k)).length;
    if (matchCount >= Math.ceil(keywords.length * 0.6)) return answer;
  }
  return null;
}

function explainFraudReport(data: Record<string, unknown>): string {
  const score = Math.round((parseFloat(String(data.fraud_score ?? 0)) || 0) * 100);
  const band = String(data.fraud_band ?? "low");
  const txn = String(data.txn_id ?? "your transaction");
  const reasons = (data.reasons as { message: string }[] | undefined) ?? [];

  if (band === "low") {
    return `Transaction ${txn} looks safe. The fraud score is ${score} out of 100, which is low. No unusual activity was found. No action is needed from you.`;
  }
  if (band === "medium") {
    const reasonText = reasons.length
      ? ` Our system noticed: ${reasons.map((r) => r.message).join(", ")}.`
      : "";
    return `Transaction ${txn} has a medium fraud score of ${score} out of 100.${reasonText} This does not mean fraud happened. A brief review may occur. If you recognise this transaction, no action is needed.`;
  }
  const reasonText = reasons.length
    ? ` The main reasons are: ${reasons.map((r) => r.message).join(", ")}.`
    : "";
  return `Transaction ${txn} has a high fraud score of ${score} out of 100.${reasonText} This transaction has been flagged for analyst review. If you did not make this transaction, please contact support immediately.`;
}

function explainRiskReport(data: Record<string, unknown>): string {
  const score = Math.round((parseFloat(String(data.risk_score ?? 0)) || 0) * 100);
  const band = String(data.risk_band ?? "low");
  const reasons = (data.reasons as { message: string }[] | undefined) ?? [];

  if (band === "low") {
    return `Your credit risk score is ${score} out of 100, which is low. This means your financial profile looks healthy and stable. Lenders are likely to view you favourably.`;
  }
  if (band === "medium") {
    const reasonText = reasons.length
      ? ` Some areas of concern include: ${reasons.map((r) => r.message).join(", ")}.`
      : "";
    return `Your credit risk score is ${score} out of 100, which is moderate.${reasonText} You may want to review your spending habits or payment history to improve your profile.`;
  }
  const reasonText = reasons.length
    ? ` Key concerns are: ${reasons.map((r) => r.message).join(", ")}.`
    : "";
  return `Your credit risk score is ${score} out of 100, which is high.${reasonText} This means lenders may require additional information or may offer different terms. Speaking with a financial advisor may help.`;
}

function generateFallback(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("score") || q.includes("number") || q.includes("percent")) {
    return "Scores are calculated by our system based on your transaction history and financial profile. A lower score is better for risk, while a higher fraud score means the transaction looks more suspicious. All high-risk scores are reviewed by a human analyst.";
  }
  if (q.includes("safe") || q.includes("fraud") || q.includes("suspicious")) {
    return "Our fraud detection system watches for unusual patterns in your transactions. If something looks unusual, it is flagged for review. Being flagged does not mean you have done anything wrong — it is a safety measure to protect you.";
  }
  if (q.includes("analyst") || q.includes("review") || q.includes("human")) {
    return "Every high-risk case is reviewed by a trained analyst. The analyst can clear the transaction, escalate it for further investigation, or block it to keep your account safe. Analysts follow strict guidelines to make fair decisions.";
  }
  return "Thank you for your question. Our system analyses transactions and financial profiles to detect fraud and assess credit risk. If you have a specific concern about a transaction or your score, please contact our support team or ask a more specific question and I will do my best to help.";
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { question, context_type, context_data } = body as {
    question?: string;
    context_type?: "fraud" | "risk" | "general";
    context_data?: Record<string, unknown>;
  };

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: { message: "Question is required." } }, { status: 400 });
  }

  const q = question.trim();
  let answer: string;
  let source: "faq" | "context" | "fallback";

  // 1. Always try FAQ match first — covers generic questions on any page
  const faq = matchFaq(q);
  if (faq) {
    answer = faq;
    source = "faq";
  } else if (context_type === "fraud" && context_data) {
    // 2. Context-aware fraud explanation
    answer = explainFraudReport(context_data);
    source = "context";
  } else if (context_type === "risk" && context_data) {
    // 3. Context-aware risk explanation
    answer = explainRiskReport(context_data);
    source = "context";
  } else {
    // 4. Keyword fallback
    answer = generateFallback(q);
    source = "fallback";
  }

  return NextResponse.json({ answer, source, question: q });
}
