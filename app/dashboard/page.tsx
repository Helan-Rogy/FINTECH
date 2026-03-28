import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import Link from "next/link";
import { ShieldAlert, TrendingUp, FileText, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [fraudRows, riskRows, reportRows] = await Promise.all([
    sql`SELECT COUNT(*) as count, AVG(fraud_score) as avg_score FROM fraud_predictions WHERE user_id = ${session!.sub}`,
    sql`SELECT COUNT(*) as count, AVG(risk_score) as avg_score FROM risk_predictions WHERE user_id = ${session!.sub}`,
    sql`SELECT COUNT(*) as count FROM reports WHERE user_id = ${session!.sub}`,
  ]);

  const fraudCount = parseInt(String(fraudRows[0]?.count ?? 0));
  const riskCount = parseInt(String(riskRows[0]?.count ?? 0));
  const reportCount = parseInt(String(reportRows[0]?.count ?? 0));
  const avgFraud = parseFloat(String(fraudRows[0]?.avg_score ?? 0)) || 0;
  const avgRisk = parseFloat(String(riskRows[0]?.avg_score ?? 0)) || 0;

  const quickActions = [
    {
      href: "/dashboard/fraud",
      icon: ShieldAlert,
      label: "Run Fraud Check",
      desc: "Score transactions against fraud patterns",
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      href: "/dashboard/risk",
      icon: TrendingUp,
      label: "Score Credit Risk",
      desc: "Evaluate a subject's creditworthiness",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      href: "/dashboard/reports",
      icon: FileText,
      label: "View Reports",
      desc: "Access your fraud & risk analysis history",
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back`}
        description="Your fraud detection and risk scoring workspace."
      />

      <DashboardStats
        fraudCount={fraudCount}
        riskCount={riskCount}
        reportCount={reportCount}
        avgFraud={avgFraud}
        avgRisk={avgRisk}
      />

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map(({ href, icon: Icon, label, desc, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-3 bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors"
            >
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                Open <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
