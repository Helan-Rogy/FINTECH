"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BandBadge, StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Loader, Check, AlertTriangle, XCircle, X } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Case {
  id: string;
  txn_id: string;
  status: "open" | "closed" | "escalated";
  decision: string | null;
  notes: string | null;
  fraud_score: number;
  fraud_band: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
  subject_email: string;
  updated_by_email: string | null;
}

interface DecisionModalProps {
  caseItem: Case;
  onClose: () => void;
  onSaved: () => void;
}

function DecisionModal({ caseItem, onClose, onSaved }: DecisionModalProps) {
  const [decision, setDecision] = useState<"clear" | "escalate" | "block">("clear");
  const [notes, setNotes] = useState(caseItem.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseItem.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes, status: "closed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to record decision.");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" role="dialog" aria-modal="true">
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">Record Decision</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="bg-muted rounded p-3 mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Transaction</p>
            <p className="text-sm font-mono text-foreground">{caseItem.txn_id}</p>
          </div>
          <BandBadge band={caseItem.fraud_band} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Decision</p>
            <div className="flex gap-2">
              {(["clear", "escalate", "block"] as const).map((d) => {
                const styles = {
                  clear: { active: "border-accent bg-accent/10 text-accent", icon: Check },
                  escalate: { active: "border-warning bg-warning/10 text-warning", icon: AlertTriangle },
                  block: { active: "border-destructive bg-destructive/10 text-destructive", icon: XCircle },
                }[d];
                const Icon = styles.icon;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecision(d)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded border py-2 text-xs font-medium capitalize transition ${
                      decision === d ? styles.active : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <Icon size={12} />
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add analyst notes..."
              className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border rounded px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition"
            >
              {loading && <Loader size={12} className="animate-spin" />}
              {loading ? "Saving..." : "Save Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const { data, isLoading } = useSWR<{ cases: Case[] }>("/api/cases", fetcher);
  const [selected, setSelected] = useState<Case | null>(null);
  const [decisionCase, setDecisionCase] = useState<Case | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "escalated">("open");

  const allCases = data?.cases ?? [];
  const filtered = filter === "all" ? allCases : allCases.filter((c) => c.status === filter);

  return (
    <>
      <PageHeader
        title="Case Management"
        description="Review flagged transactions and record analyst decisions."
      />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1 w-fit">
        {(["open", "all", "closed", "escalated"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition ${
              filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
            {f !== "all" && (
              <span className="ml-1.5 text-muted-foreground">
                ({allCases.filter((c) => c.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Cases table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} cases.</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[560px] overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-center gap-4 px-4 py-3 text-left transition ${selected?.id === c.id ? "bg-primary/5" : "hover:bg-muted"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-mono text-foreground truncate">{c.txn_id}</p>
                      <BandBadge band={c.fraud_band} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(c.fraud_score * 100)}% fraud · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Case detail */}
        {selected ? (
          <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Case ID</p>
                <p className="text-xs font-mono text-foreground">{selected.id}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Transaction", value: selected.txn_id },
                { label: "Subject", value: selected.subject_email },
                { label: "Fraud Score", value: `${Math.round(selected.fraud_score * 100)}%` },
                { label: "Created", value: formatDate(selected.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted rounded p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-xs font-mono text-foreground truncate">{value}</p>
                </div>
              ))}
            </div>

            {selected.decision && (
              <div className="bg-muted rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Decision</p>
                <p className={`text-sm font-medium capitalize ${
                  selected.decision === "clear" ? "text-accent"
                  : selected.decision === "escalate" ? "text-warning"
                  : "text-destructive"
                }`}>
                  {selected.decision}
                </p>
                {selected.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{selected.notes}</p>
                )}
                {selected.updated_by_email && (
                  <p className="text-xs text-muted-foreground mt-1">By: {selected.updated_by_email}</p>
                )}
              </div>
            )}

            {selected.status === "open" && (
              <button
                onClick={() => setDecisionCase(selected)}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition"
              >
                Record Decision
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a case to view details and record a decision.</p>
          </div>
        )}
      </div>

      {decisionCase && (
        <DecisionModal
          caseItem={decisionCase}
          onClose={() => setDecisionCase(null)}
          onSaved={() => {
            mutate("/api/cases");
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
