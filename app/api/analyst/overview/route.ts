import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "user") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [caseStats, recentCases] = await Promise.all([
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open') AS open_count,
          COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
          COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
          COUNT(*) FILTER (WHERE fraud_band = 'high') AS high_count
        FROM cases
      `,
      sql`
        SELECT id, txn_id, status, fraud_score, fraud_band, created_at
        FROM cases
        WHERE status = 'open'
        ORDER BY fraud_score DESC
        LIMIT 5
      `,
    ]);

    const s = caseStats[0] as Record<string, unknown>;
    return NextResponse.json({
      open: parseInt(String(s.open_count ?? 0)),
      closed: parseInt(String(s.closed_count ?? 0)),
      escalated: parseInt(String(s.escalated_count ?? 0)),
      high: parseInt(String(s.high_count ?? 0)),
      recentCases,
      email: session.email,
      role: session.role,
    });
  } catch (err) {
    console.error("[analyst/overview]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
