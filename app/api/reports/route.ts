import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await sql`
      SELECT id, summary, fraud_section, risk_section, next_steps, created_at
      FROM reports
      WHERE user_id = ${session.sub}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return NextResponse.json({ reports: rows });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });
    return NextResponse.json({ error: { code: "internal_error", message: "Failed to fetch reports." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { fraud_results, risk_result } = body;

    const fraudFlagged = (fraud_results ?? []).filter((r: { fraud_band: string }) => r.fraud_band !== "low").length;
    const fraudTotal = (fraud_results ?? []).length;
    const topPatterns = [
      ...new Set(
        (fraud_results ?? [])
          .flatMap((r: { reasons?: { code: string }[] }) => (r.reasons ?? []).map((x: { code: string }) => x.code))
          .slice(0, 3)
      ),
    ];

    const fraudSection = {
      scored_count: fraudTotal,
      flagged_count: fraudFlagged,
      flagged_rate: fraudTotal ? parseFloat((fraudFlagged / fraudTotal).toFixed(4)) : 0,
      top_patterns: topPatterns,
    };

    const riskSection = risk_result
      ? {
          risk_band: risk_result.risk_band,
          risk_score: risk_result.risk_score,
          top_factors: (risk_result.reasons ?? []).map((r: { code: string }) => r.code).slice(0, 3),
        }
      : null;

    const summary =
      fraudFlagged > 0 && riskSection?.risk_band === "high"
        ? `We found ${fraudFlagged} flagged transaction${fraudFlagged > 1 ? "s" : ""} and your risk profile is rated high. Immediate review is recommended.`
        : fraudFlagged > 0
        ? `We found ${fraudFlagged} flagged transaction${fraudFlagged > 1 ? "s" : ""} that may need your attention.`
        : riskSection?.risk_band === "high"
        ? "No flagged transactions, but your credit risk profile is high."
        : "No significant issues detected. Your profile looks healthy.";

    const nextSteps: string[] = [];
    if (fraudFlagged > 0) nextSteps.push("Review the flagged transactions for unfamiliar activity.");
    if (riskSection?.risk_band === "high") nextSteps.push("Work to reduce spending relative to income.");
    if (riskSection?.risk_band === "medium") nextSteps.push("Maintain consistent payment history to improve your risk score.");
    if (nextSteps.length === 0) nextSteps.push("No immediate actions required. Continue monitoring.");

    const id = generateId("r");
    await sql`
      INSERT INTO reports (id, user_id, summary, fraud_section, risk_section, next_steps)
      VALUES (${id}, ${session.sub}, ${summary}, ${JSON.stringify(fraudSection)},
              ${JSON.stringify(riskSection)}, ${JSON.stringify(nextSteps)})
    `;

    return NextResponse.json({
      report_id: id,
      user_id: session.sub,
      summary,
      fraud_section: fraudSection,
      risk_section: riskSection,
      next_steps: nextSteps,
      created_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });
    console.error("[reports]", err);
    return NextResponse.json({ error: { code: "internal_error", message: "Failed to create report." } }, { status: 500 });
  }
}
