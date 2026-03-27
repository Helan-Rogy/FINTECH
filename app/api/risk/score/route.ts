import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { generateId } from "@/lib/utils";

type RiskBand = "low" | "medium" | "high";

interface RiskFeatures {
  income_monthly?: number;
  employment_years?: number;
  credit_history_months?: number;
  avg_monthly_spend?: number;
  late_payments_12m?: number;
}

// Rule-based risk scoring engine (demo — production uses Python ML model)
function scoreRisk(subjectId: string, features: RiskFeatures) {
  const reasons: { code: string; message: string; weight: number }[] = [];
  const {
    income_monthly = 30000,
    employment_years = 3,
    credit_history_months = 24,
    avg_monthly_spend = 20000,
    late_payments_12m = 0,
  } = features;

  const spendRatio = avg_monthly_spend / (income_monthly || 1);

  if (late_payments_12m >= 2) reasons.push({ code: "RISK_PAYMENT_LATE", message: `${late_payments_12m} late payments in the past 12 months.`, weight: 0.3 });
  if (employment_years < 1) reasons.push({ code: "RISK_EMPLOYMENT_SHORT", message: "Less than 1 year of employment history.", weight: 0.25 });
  if (income_monthly < 15000) reasons.push({ code: "RISK_INCOME_LOW", message: "Monthly income is below the recommended threshold.", weight: 0.2 });
  if (credit_history_months < 6) reasons.push({ code: "RISK_CREDIT_NEW", message: "Credit history shorter than 6 months.", weight: 0.2 });
  if (spendRatio > 0.8) reasons.push({ code: "RISK_SPEND_HIGH", message: `Spending is ${Math.round(spendRatio * 100)}% of income.`, weight: 0.15 });
  if (credit_history_months < 24) reasons.push({ code: "RISK_PROFILE_YOUNG", message: "Credit profile is relatively new.", weight: 0.1 });

  const totalWeight = reasons.reduce((s, r) => s + r.weight, 0);
  const risk_score = Math.min(0.99, Math.max(0.01, totalWeight + Math.random() * 0.05));
  const risk_band: RiskBand = risk_score >= 0.65 ? "high" : risk_score >= 0.35 ? "medium" : "low";
  const confidence = parseFloat((0.8 + Math.random() * 0.15).toFixed(2));
  const primary_reason = reasons.length > 0 ? reasons[0].code : "RISK_PROFILE_YOUNG";

  const human_summary =
    risk_band === "high"
      ? "This subject presents a high credit risk. Several key indicators require careful consideration before extending credit."
      : risk_band === "medium"
      ? "This subject has a moderate risk profile. Some factors may require further review."
      : "This subject presents a low credit risk with a solid financial profile.";

  const suggested_actions =
    risk_band === "high"
      ? ["Decline or seek additional guarantors", "Request further income verification", "Offer reduced credit limit"]
      : risk_band === "medium"
      ? ["Request supporting documentation", "Apply standard rate with monitoring"]
      : ["Proceed with standard terms"];

  return {
    subject_id: subjectId,
    risk_score: parseFloat(risk_score.toFixed(4)),
    risk_band,
    confidence,
    primary_reason,
    reasons: reasons.map(({ code, message }) => ({ code, message })).slice(0, 4),
    human_summary,
    suggested_actions,
    features,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { subject_id, features } = body;

    if (!subject_id) {
      return NextResponse.json(
        { error: { code: "bad_request", message: "Missing required field: subject_id" } },
        { status: 400 }
      );
    }

    const result = scoreRisk(subject_id, features ?? {});

    const id = generateId("rp");
    await sql`
      INSERT INTO risk_predictions
        (id, user_id, subject_id, risk_score, risk_band, confidence, primary_reason, reasons, human_summary, suggested_actions, features)
      VALUES
        (${id}, ${session.sub}, ${result.subject_id}, ${result.risk_score}, ${result.risk_band},
         ${result.confidence}, ${result.primary_reason}, ${JSON.stringify(result.reasons)},
         ${result.human_summary}, ${JSON.stringify(result.suggested_actions)}, ${JSON.stringify(result.features)})
    `;

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });
    console.error("[risk/score]", err);
    return NextResponse.json({ error: { code: "internal_error", message: "Scoring failed." } }, { status: 500 });
  }
}
