import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { Briefcase, ArrowRight, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default async function AnalystOverviewPage() {
  const session = await getSession();
  if (!session) { redirect("/login"); return null; }

  const [caseStats, recentCases] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_count,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
        COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
        COUNT(*) FILTER (WHERE fraud_band = 'high') AS high_count,
        AVG(fraud_score) AS avg_score
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

  const stats = caseStats[0] as Record<string, unknown>;
  const open = parseInt(String(stats.open_count ?? 0));
  const closed = parseInt(String(stats.closed_count ?? 0));
  const escalated = parseInt(String(stats.escalated_count ?? 0));
  const high = parseInt(String(stats.high_count ?? 0));

  const kpis = [
    { label: "Open Cases", value: open, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    { label: "Closed Cases", value: closed, icon: CheckCircle, color: "text-accent", bg: "bg-accent/10" },
    { label: "Escalated", value: escalated, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "High Risk", value: high, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <>
      <PageHeader
        title="Analyst Overview"
        description={`Signed in as ${session?.email} (${session?.role})`}
        action={
          <Link
            href="/analyst/cases"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded px-3 py-2 text-xs font-medium hover:bg-primary/90 transition"
          >
            <Briefcase size={12} /> Review Cases
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className={`w-7 h-7 rounded ${bg} flex items-center justify-center`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className="text-2xl font-semibold font-mono text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent open cases */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Open High-Priority Cases</p>
          <Link
            href="/analyst/cases"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {(recentCases as Record<string, unknown>[]).length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle size={24} className="text-accent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No open cases. Queue is clear.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Case ID", "Transaction", "Fraud Score", "Band", "Created"].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(recentCases as Record<string, unknown>[]).map((c) => (
                <tr key={String(c.id)} className="hover:bg-muted/50 transition">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{String(c.id)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-foreground">{String(c.txn_id)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-foreground">
                    {(parseFloat(String(c.fraud_score)) * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${
                      c.fraud_band === "high" ? "text-destructive" : c.fraud_band === "medium" ? "text-warning" : "text-accent"
                    }`}>
                      {String(c.fraud_band).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {new Date(String(c.created_at)).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
