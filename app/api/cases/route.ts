import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession(["analyst", "admin"]);
    const rows = await sql`
      SELECT
        c.id, c.txn_id, c.status, c.decision, c.notes,
        c.fraud_score, c.fraud_band, c.created_at, c.updated_at,
        u.email AS subject_email,
        ub.email AS updated_by_email
      FROM cases c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN users ub ON ub.id = c.updated_by
      ORDER BY
        CASE c.fraud_band WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        c.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ cases: rows, analyst: { id: session.sub, email: session.email, role: session.role } });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: { code: "forbidden", message: "Analyst or admin role required." } }, { status: 403 });
    return NextResponse.json({ error: { code: "internal_error", message: "Failed to fetch cases." } }, { status: 500 });
  }
}
