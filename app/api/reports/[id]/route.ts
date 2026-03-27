import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const rows = await sql`
      SELECT id, user_id, summary, fraud_section, risk_section, next_steps, created_at
      FROM reports
      WHERE id = ${id} AND user_id = ${session.sub}
      LIMIT 1
    `;

    if (!rows[0]) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Report not found." } },
        { status: 404 }
      );
    }

    const r = rows[0] as Record<string, unknown>;
    return NextResponse.json({
      report_id: r.id,
      user_id: r.user_id,
      summary: r.summary,
      fraud_section: r.fraud_section,
      risk_section: r.risk_section,
      next_steps: r.next_steps,
      created_at: r.created_at,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });
    return NextResponse.json({ error: { code: "internal_error", message: "Failed to fetch report." } }, { status: 500 });
  }
}
