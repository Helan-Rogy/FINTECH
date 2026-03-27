"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/layout/page-header";
import { BandBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { FileText, ChevronRight, Loader } from "lucide-react";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Report {
  id: string;
  summary: string;
  fraud_section: {
    scored_count: number;
    flagged_count: number;
    flagged_rate: number;
    top_patterns: string[];
  } | null;
  risk_section: {
    risk_band: "low" | "medium" | "high";
    risk_score: number;
    top_factors: string[];
  } | null;
  next_steps: string[];
  created_at: string;
}

export default function ReportsPage() {
  const { data, isLoading } = useSWR<{ reports: Report[] }>("/api/reports", fetcher);
  const [selected, setSelected] = useState<Report | null>(null);

  const reports = data?.reports ?? [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Your fraud and risk analysis history."
      />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && reports.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-10 text-center">
          <FileText size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No reports yet. Run a fraud or risk score to generate your first report.</p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* List */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All Reports</p>
            </div>
            <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${selected?.id === r.id ? "bg-primary/5" : "hover:bg-muted"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{r.id}</p>
                    <p className="text-sm text-foreground mt-0.5 truncate">{r.summary}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {r.risk_section && (
                      <BandBadge band={r.risk_section.risk_band} />
                    )}
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          {selected ? (
            <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-5">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">{selected.id}</p>
                <p className="text-xs text-muted-foreground">{formatDate(selected.created_at)}</p>
              </div>

              <div className="bg-muted rounded p-4">
                <p className="text-sm text-foreground leading-relaxed">{selected.summary}</p>
              </div>

              {selected.fraud_section && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Fraud Section</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Scored", value: selected.fraud_section.scored_count },
                      { label: "Flagged", value: selected.fraud_section.flagged_count },
                      { label: "Rate", value: `${(selected.fraud_section.flagged_rate * 100).toFixed(1)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-background border border-border rounded p-2 text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                  {selected.fraud_section.top_patterns.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.fraud_section.top_patterns.map((p) => (
                        <span key={p} className="text-xs bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground font-mono">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selected.risk_section && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Risk Section</p>
                  <div className="flex items-center gap-3 mb-3">
                    <BandBadge band={selected.risk_section.risk_band} label={`${selected.risk_section.risk_band.toUpperCase()} RISK`} />
                    <span className="text-xs text-muted-foreground">Score: {Math.round(selected.risk_section.risk_score * 100)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.risk_section.top_factors.map((f) => (
                      <span key={f} className="text-xs bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground font-mono">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {selected.next_steps?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Next Steps</p>
                  <ul className="flex flex-col gap-1.5">
                    {selected.next_steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-0.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a report to view details.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
