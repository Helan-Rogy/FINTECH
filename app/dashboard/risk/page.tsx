"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BandBadge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { ReasonCard } from "@/components/ui/reason-card";
import { Loader, Play } from "lucide-react";
import { AssistantChat } from "@/components/accessibility/assistant-chat";
import { SimplifiedReport } from "@/components/accessibility/simplified-report";

interface RiskFeatures {
  income_monthly: string;
  employment_years: string;
  credit_history_months: string;
  avg_monthly_spend: string;
  late_payments_12m: string;
}

interface RiskResult {
  subject_id: string;
  risk_score: number;
  risk_band: "low" | "medium" | "high";
  confidence: number;
  primary_reason: string;
  reasons: { code: string; message: string }[];
  human_summary: string;
  suggested_actions: string[];
  features: Record<string, number>;
}

const defaultFeatures: RiskFeatures = {
  income_monthly: "30000",
  employment_years: "3",
  credit_history_months: "24",
  avg_monthly_spend: "20000",
  late_payments_12m: "0",
};

export default function RiskScorePage() {
  const [subjectId, setSubjectId] = useState(`S-${Date.now()}`);
  const [features, setFeatures] = useState<RiskFeatures>(defaultFeatures);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateFeature(field: keyof RiskFeatures, value: string) {
    setFeatures((prev) => ({ ...prev, [field]: value }));
  }

  async function handleScore() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/risk/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          features: {
            income_monthly: parseFloat(features.income_monthly),
            employment_years: parseFloat(features.employment_years),
            credit_history_months: parseInt(features.credit_history_months),
            avg_monthly_spend: parseFloat(features.avg_monthly_spend),
            late_payments_12m: parseInt(features.late_payments_12m),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Scoring failed.");
      setResult(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: keyof RiskFeatures; label: string; suffix?: string }[] = [
    { key: "income_monthly", label: "Monthly Income (R)", suffix: "ZAR" },
    { key: "employment_years", label: "Employment Years" },
    { key: "credit_history_months", label: "Credit History (months)" },
    { key: "avg_monthly_spend", label: "Avg Monthly Spend (R)", suffix: "ZAR" },
    { key: "late_payments_12m", label: "Late Payments (last 12m)" },
  ];

  return (
    <>
      <PageHeader
        title="Credit Risk Scoring"
        description="Evaluate a subject&apos;s credit risk profile from financial indicators."
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium text-foreground mb-4">Subject Profile</h2>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Subject ID</label>
            <input
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="bg-muted border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-3">
            {fields.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <input
                  type="number"
                  value={features[key]}
                  onChange={(e) => updateFeature(key, e.target.value)}
                  className="bg-muted border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleScore}
            disabled={loading}
            className="mt-5 flex items-center gap-2 bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition w-full justify-center"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? "Scoring..." : "Calculate Risk Score"}
          </button>
        </div>

        {/* Result */}
        {result ? (
          <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-mono text-foreground">{result.subject_id}</p>
              </div>
              <ScoreGauge
                score={result.risk_score}
                label="Risk Score"
                band={result.risk_band}
                size={100}
              />
            </div>

            <div className="flex items-center gap-3">
              <BandBadge band={result.risk_band} label={`${result.risk_band.toUpperCase()} RISK`} />
              <span className="text-xs text-muted-foreground">
                Confidence: {Math.round(result.confidence * 100)}%
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{result.human_summary}</p>

            {/* Feature bar chart */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Input Summary</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(result.features).map(([k, v]) => (
                  <div key={k} className="bg-muted rounded px-3 py-2">
                    <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                    <p className="text-sm font-mono text-foreground">{typeof v === "number" ? v.toLocaleString() : v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Risk Factors</p>
              <ReasonCard reasons={result.reasons} type="risk" />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recommendations</p>
              <ul className="flex flex-col gap-1.5">
                {result.suggested_actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border pt-4">
              <SimplifiedReport
                type="risk"
                riskScore={result.risk_score}
                riskBand={result.risk_band}
                humanSummary={result.human_summary}
                suggestedActions={result.suggested_actions}
              />
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-center text-center">
            <div>
              <p className="text-sm text-muted-foreground">Fill in the subject profile and run the scorer to see results.</p>
            </div>
          </div>
        )}
      </div>

      <AssistantChat
        contextType={result ? "risk" : "general"}
        contextData={result ? {
          risk_score: result.risk_score,
          risk_band: result.risk_band,
          reasons: result.reasons,
        } : undefined}
      />
    </>
  );
}
