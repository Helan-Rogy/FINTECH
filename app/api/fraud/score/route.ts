import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { generateId } from "@/lib/utils";

type FraudBand = "low" | "medium" | "high";

interface Transaction {
  txn_id: string;
  amount?: number;
  merchant_new?: boolean;
  new_country?: boolean;
  new_city?: boolean;
  velocity_count?: number;
  geo_mismatch?: boolean;
  device_new?: boolean;
}

interface ScoredResult {
  txn_id: string;
  fraud_score: number;
  fraud_band: FraudBand;
  confidence: number;
  primary_reason: string;
  reasons: { code: string; message: string }[];
  human_summary: string;
  suggested_actions: string[];
}

// Deterministic rule-based scoring engine (demo — real system uses Python ML)
function scoreTransaction(txn: Transaction): ScoredResult {
  const reasons: { code: string; message: string; weight: number }[] = [];

  if (txn.geo_mismatch) reasons.push({ code: "FRD_GEO_MISMATCH", message: "Impossible travel distance detected.", weight: 0.35 });
  if (txn.new_country) reasons.push({ code: "FRD_GEO_NEW_COUNTRY", message: "Transaction in a new country.", weight: 0.25 });
  if ((txn.velocity_count ?? 0) > 4) reasons.push({ code: "FRD_VEL_HIGH", message: "High transaction frequency in short window.", weight: 0.2 });
  if (txn.merchant_new) reasons.push({ code: "FRD_MERCHANT_NEW", message: "First transaction with this merchant.", weight: 0.1 });
  if (txn.new_city) reasons.push({ code: "FRD_GEO_NEW_CITY", message: "First transaction in this city.", weight: 0.08 });
  if (txn.device_new) reasons.push({ code: "FRD_DEVICE_NEW", message: "Transaction from an unrecognized device.", weight: 0.06 });
  if ((txn.amount ?? 0) > 5000) reasons.push({ code: "FRD_AMT_SPIKE", message: "Transaction amount far above baseline.", weight: 0.15 });

  const totalWeight = reasons.reduce((s, r) => s + r.weight, 0);
  const fraud_score = Math.min(0.99, Math.max(0.01, totalWeight + Math.random() * 0.05));
  const fraud_band: FraudBand = fraud_score >= 0.7 ? "high" : fraud_score >= 0.4 ? "medium" : "low";
  const confidence = parseFloat((0.75 + Math.random() * 0.2).toFixed(2));
  const primary_reason = reasons.length > 0 ? reasons[0].code : "FRD_MERCHANT_NEW";

  const human_summary =
    fraud_band === "high"
      ? "This transaction has multiple strong fraud indicators and warrants immediate review."
      : fraud_band === "medium"
      ? "This transaction has some unusual patterns. Further review is recommended."
      : "This transaction appears normal based on available signals.";

  const suggested_actions =
    fraud_band === "high"
      ? ["Place transaction on hold", "Contact customer to verify", "Escalate to fraud team"]
      : fraud_band === "medium"
      ? ["Review transaction history", "Send activity alert to customer"]
      : ["No immediate action required"];

  return {
    txn_id: txn.txn_id,
    fraud_score: parseFloat(fraud_score.toFixed(4)),
    fraud_band,
    confidence,
    primary_reason,
    reasons: reasons.map(({ code, message }) => ({ code, message })).slice(0, 4),
    human_summary,
    suggested_actions,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const transactions: Transaction[] = body.transactions ?? [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: { code: "bad_request", message: "Provide a non-empty transactions array." } },
        { status: 400 }
      );
    }

    const results = transactions.map(scoreTransaction);

    // Persist each prediction
    for (const r of results) {
      const id = generateId("fp");
      await sql`
        INSERT INTO fraud_predictions
          (id, user_id, txn_id, fraud_score, fraud_band, confidence, primary_reason, reasons, human_summary, suggested_actions)
        VALUES
          (${id}, ${session.sub}, ${r.txn_id}, ${r.fraud_score}, ${r.fraud_band},
           ${r.confidence}, ${r.primary_reason}, ${JSON.stringify(r.reasons)},
           ${r.human_summary}, ${JSON.stringify(r.suggested_actions)})
      `;

      // Auto-create case for high-risk
      if (r.fraud_band === "high") {
        const caseId = generateId("c");
        await sql`
          INSERT INTO cases (id, txn_id, prediction_id, user_id, fraud_score, fraud_band)
          SELECT ${caseId}, ${r.txn_id}, fp.id, ${session.sub}, ${r.fraud_score}, ${r.fraud_band}
          FROM fraud_predictions fp WHERE fp.txn_id = ${r.txn_id} AND fp.user_id = ${session.sub}
          ORDER BY fp.created_at DESC LIMIT 1
          ON CONFLICT DO NOTHING
        `;
      }
    }

    const flagged = results.filter((r) => r.fraud_band !== "low");
    return NextResponse.json({
      results,
      summary: {
        scored_count: results.length,
        flagged_count: flagged.length,
        flagged_rate: parseFloat((flagged.length / results.length).toFixed(4)),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });
    console.error("[fraud/score]", err);
    return NextResponse.json({ error: { code: "internal_error", message: "Scoring failed." } }, { status: 500 });
  }
}
