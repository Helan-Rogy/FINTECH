import { formatScore } from "@/lib/utils";
import { ShieldAlert, TrendingUp, FileText, Activity } from "lucide-react";

interface DashboardStatsProps {
  fraudCount: number;
  riskCount: number;
  reportCount: number;
  avgFraud: number;
  avgRisk: number;
}

export function DashboardStats({ fraudCount, riskCount, reportCount, avgFraud, avgRisk }: DashboardStatsProps) {
  const stats = [
    {
      label: "Transactions Scored",
      value: fraudCount.toLocaleString(),
      icon: ShieldAlert,
      sub: fraudCount > 0 ? `Avg fraud score ${formatScore(avgFraud)}` : "No transactions scored yet",
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
    },
    {
      label: "Risk Assessments",
      value: riskCount.toLocaleString(),
      icon: TrendingUp,
      sub: riskCount > 0 ? `Avg risk score ${formatScore(avgRisk)}` : "No risk assessments yet",
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
    },
    {
      label: "Reports Generated",
      value: reportCount.toLocaleString(),
      icon: FileText,
      sub: "Combined fraud & risk reports",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      label: "Status",
      value: fraudCount + riskCount === 0 ? "New" : "Active",
      icon: Activity,
      sub: "Platform activity",
      iconColor: "text-accent",
      iconBg: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, sub, iconColor, iconBg }) => (
        <div key={label} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className={`w-7 h-7 rounded ${iconBg} flex items-center justify-center`}>
              <Icon size={14} className={iconColor} />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground font-mono">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}
