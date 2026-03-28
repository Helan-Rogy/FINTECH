"use client";

import useSWR from "swr";
import Link from "next/link";
import { ShieldAlert, TrendingUp, FileText, ArrowRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

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

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/dashboard/stats", fetcher);

  const fraudCount = data?.fraudCount ?? 0;
  const riskCount = data?.riskCount ?? 0;
  const reportCount = data?.reportCount ?? 0;
  const avgFraud = (data?.avgFraud ?? 0).toFixed(1);
  const avgRisk = (data?.avgRisk ?? 0).toFixed(1);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your fraud detection and risk scoring workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Fraud Checks"
          value={isLoading ? "—" : fraudCount}
          sub={isLoading ? "" : `Avg score: ${avgFraud}`}
        />
        <StatCard
          label="Risk Profiles"
          value={isLoading ? "—" : riskCount}
          sub={isLoading ? "" : `Avg score: ${avgRisk}`}
        />
        <StatCard
          label="Reports Generated"
          value={isLoading ? "—" : reportCount}
        />
        <StatCard
          label="Platform Status"
          value="Operational"
          sub="All systems normal"
        />
      </div>

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
