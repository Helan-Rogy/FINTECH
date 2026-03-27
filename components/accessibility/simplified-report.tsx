"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimplifiedFraudReportProps {
  txnId: string;
  fraudScore: number;
  fraudBand: "low" | "medium" | "high";
  primaryReason: string;
  humanSummary: string;
  suggestedActions: string[];
}

interface SimplifiedRiskReportProps {
  riskScore: number;
  riskBand: "low" | "medium" | "high";
  humanSummary: string;
  suggestedActions: string[];
}

type Props =
  | ({ type: "fraud" } & SimplifiedFraudReportProps)
  | ({ type: "risk" } & SimplifiedRiskReportProps);

const bandConfig = {
  low: {
    icon: CheckCircle,
    label: "Safe",
    color: "text-accent",
    bg: "bg-accent/10 border-accent/20",
    message: "Everything looks normal.",
  },
  medium: {
    icon: AlertTriangle,
    label: "Needs Review",
    color: "text-warning",
    bg: "bg-warning/10 border-warning/20",
    message: "Some things look unusual.",
  },
  high: {
    icon: XCircle,
    label: "Action Needed",
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
    message: "This needs urgent attention.",
  },
};

export function SimplifiedReport(props: Props) {
  const [simplified, setSimplified] = useState(false);

  const band = props.type === "fraud" ? props.fraudBand : props.riskBand;
  const score =
    props.type === "fraud" ? props.fraudScore : props.riskScore;
  const config = bandConfig[band];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle */}
      <button
        onClick={() => setSimplified((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition w-fit"
        aria-pressed={simplified}
      >
        {simplified ? <Eye size={12} /> : <EyeOff size={12} />}
        {simplified ? "Show technical view" : "Show simplified view"}
      </button>

      {simplified ? (
        /* ── Simplified mode ── */
        <div className={cn("border rounded-lg p-4 flex flex-col gap-3", config.bg)}>
          <div className="flex items-center gap-2">
            <Icon size={20} className={config.color} />
            <div>
              <p className={cn("text-base font-semibold", config.color)}>{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.message}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded p-3">
            <p className="text-xs text-muted-foreground mb-1">What this means for you</p>
            <p className="text-sm text-foreground leading-relaxed">{props.humanSummary}</p>
          </div>

          {props.suggestedActions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">What to do next</p>
              <ul className="flex flex-col gap-1.5">
                {props.suggestedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", config.color.replace("text-", "bg-"))} />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Plain-language score bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{props.type === "fraud" ? "Fraud" : "Risk"} level</span>
              <span className={config.color}>{Math.round(score * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  band === "high" ? "bg-destructive" : band === "medium" ? "bg-warning" : "bg-accent"
                )}
                style={{ width: `${Math.round(score * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
