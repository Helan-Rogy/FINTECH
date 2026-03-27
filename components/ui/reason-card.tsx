import { cn } from "@/lib/utils";
import { FRAUD_REASON_LABELS, RISK_REASON_LABELS } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

interface Reason {
  code: string;
  message: string;
}

interface ReasonCardProps {
  reasons: Reason[];
  type: "fraud" | "risk";
  className?: string;
}

const CRITICAL_CODES = new Set([
  "FRD_GEO_MISMATCH", "FRD_DEVICE_FLAGGED", "FRD_MERCHANT_FLAGGED",
  "RISK_PAYMENT_LATE", "RISK_EMPLOYMENT_GAPS", "RISK_INCOME_LOW",
]);

export function ReasonCard({ reasons, type, className }: ReasonCardProps) {
  const labels = type === "fraud" ? FRAUD_REASON_LABELS : RISK_REASON_LABELS;

  if (!reasons.length) {
    return (
      <div className={cn("rounded border border-border p-4 bg-card", className)}>
        <p className="text-sm text-muted-foreground">No significant factors detected.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {reasons.map((r, i) => {
        const isCritical = CRITICAL_CODES.has(r.code);
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded border p-3 bg-card",
              isCritical ? "border-destructive/30" : "border-border"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {isCritical ? (
                <AlertTriangle size={14} className="text-destructive" />
              ) : (
                <Info size={14} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                {labels[r.code] ?? r.code}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
