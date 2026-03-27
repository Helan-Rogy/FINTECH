import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(["analyst", "admin"]);
    const { id } = await params;
    const body = await req.json();
    const { decision, notes, status } = body;

    if (!decision || !status) {
      return NextResponse.json(
        { error: { code: "bad_request", message: "decision and status are required." } },
        { status: 400 }
      );
    }

    const allowed = ["clear", "escalate", "block"];
    if (!allowed.includes(decision)) {
      return NextResponse.json(
        { error: { code: "bad_request", message: `decision must be one of: ${allowed.join(", ")}` } },
        { status: 400 }
      );
    }

    const rows = await sql`
      UPDATE cases
      SET decision = ${decision}, notes = ${notes ?? null}, status = ${status},
          updated_by = ${session.sub}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, txn_id, status, decision, notes, updated_by, updated_at
    `;

    if (!rows[0]) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Case not found." } },
        { status: 404 }
      );
    }

    // Audit log
    await sql`
      INSERT INTO audit_log (actor_id, action, entity_type, entity_id, meta)
      VALUES (${session.sub}, 'case_decision', 'case', ${id},
              ${JSON.stringify({ decision, status, notes })})
    `;

    const c = rows[0] as Record<string, unknown>;
    return NextResponse.json({
      case_id: c.id,
      status: c.status,
      decision: c.decision,
      notes: c.notes,
      updated_by: session.email,
      updated_at: c.updated_at,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "Unauthorized") return NextResponse.json({ error: { code: "unauthorized", message: "Not authenticated." } }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: { code: "forbidden", message: "Analyst role required." } }, { status: 403 });
    console.error("[cases/decision]", err);
    return NextResponse.json({ error: { code: "internal_error", message: "Failed to record decision." } }, { status: 500 });
  }
}
