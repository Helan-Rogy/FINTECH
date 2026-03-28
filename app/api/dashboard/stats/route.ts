import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.sub;
    const [fraudRows, riskRows, reportRows] = await Promise.all([
      sql`SELECT COUNT(*) as count, COALESCE(AVG(fraud_score),0) as avg_score FROM fraud_predictions WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*) as count, COALESCE(AVG(risk_score),0) as avg_score FROM risk_predictions WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*) as count FROM reports WHERE user_id = ${userId}`,
    ]);

    return NextResponse.json({
      fraudCount: parseInt(String(fraudRows[0]?.count ?? 0)),
      riskCount: parseInt(String(riskRows[0]?.count ?? 0)),
      reportCount: parseInt(String(reportRows[0]?.count ?? 0)),
      avgFraud: parseFloat(String(fraudRows[0]?.avg_score ?? 0)) || 0,
      avgRisk: parseFloat(String(riskRows[0]?.avg_score ?? 0)) || 0,
    });
  } catch (err) {
    console.error("[dashboard/stats]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
