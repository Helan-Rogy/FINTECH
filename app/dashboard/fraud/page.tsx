"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BandBadge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { ReasonCard } from "@/components/ui/reason-card";
import { formatScore } from "@/lib/utils";
import { Loader, Plus, Trash2, Play } from "lucide-react";

interface TxnInput {
  txn_id: string;
  amount: string;
  merchant_new: boolean;
  new_country: boolean;
  new_city: boolean;
  geo_mismatch: boolean;
  velocity_count: string;
  device_new: boolean;
}

interface ScoredResult {
  txn_id: string;
  fraud_score: number;
  fraud_band: "low" | "medium" | "high";
  confidence: number;
  primary_reason: string;
  reasons: { code: string; message: string }[];
  human_summary: string;
  suggested_actions: string[];
}

const emptyTxn = (): TxnInput => ({
  txn_id: `TXN-${Date.now()}`,
  amount: "500",
  merchant_new: false,
  new_country: false,
  new_city: false,
  geo_mismatch: false,
  velocity_count: "1",
  device_new: false,
});

export default function FraudCheckPage() {
  const [transactions, setTransactions] = useState<TxnInput[]>([emptyTxn()]);
  const [results, setResults] = useState<ScoredResult[] | null>(null);
  const [summary, setSummary] = useState<{ scored_count: number; flagged_count: number; flagged_rate: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number>(0);

  function addTxn() {
    setTransactions((prev) => [...prev, emptyTxn()]);
  }

  function removeTxn(i: number) {
    setTransactions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTxn(i: number, field: keyof TxnInput, value: string | boolean) {
    setTransactions((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t))
    );
  }

  async function handleScore() {
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const payload = transactions.map((t) => ({
        txn_id: t.txn_id || `TXN-${Date.now()}`,
        amount: parseFloat(t.amount) || 0,
        merchant_new: t.merchant_new,
        new_country: t.new_country,
        new_city: t.new_city,
        geo_mismatch: t.geo_mismatch,
        velocity_count: parseInt(t.velocity_count) || 1,
        device_new: t.device_new,
      }));

      const res = await fetch("/api/fraud/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Scoring failed.");
      setResults(data.results);
      setSummary(data.summary);
      setSelected(0);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedResult = results?.[selected];

  return (
    <>
      <PageHeader
        title="Fraud Detection"
        description="Score transactions to detect potential fraud patterns."
      />

      <div className="flex flex-col gap-6">
        {/* Input Panel */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground">Transactions</h2>
            <button
              onClick={addTxn}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-primary/20 rounded px-2.5 py-1.5 transition"
            >
              <Plus size={12} /> Add Transaction
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            {transactions.map((t, i) => (
              <div key={i} className="flex flex-col gap-3 bg-muted rounded p-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-muted-foreground">Transaction ID</label>
                    <input
                      value={t.txn_id}
                      onChange={(e) => updateTxn(i, "txn_id", e.target.value)}
                      className="bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-28">
                    <label className="text-xs text-muted-foreground">Amount (R)</label>
                    <input
                      type="number"
                      value={t.amount}
                      onChange={(e) => updateTxn(i, "amount", e.target.value)}
                      className="bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-24">
                    <label className="text-xs text-muted-foreground">Velocity</label>
                    <input
                      type="number"
                      value={t.velocity_count}
                      onChange={(e) => updateTxn(i, "velocity_count", e.target.value)}
                      className="bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {transactions.length > 1 && (
                    <button
                      onClick={() => removeTxn(i)}
                      className="text-muted-foreground hover:text-destructive mt-4 transition"
                      aria-label="Remove transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {/* Flags */}
                <div className="flex flex-wrap gap-3">
                  {[
                    { field: "merchant_new", label: "New merchant" },
                    { field: "new_country", label: "New country" },
                    { field: "new_city", label: "New city" },
                    { field: "geo_mismatch", label: "Geo mismatch" },
                    { field: "device_new", label: "New device" },
                  ].map(({ field, label }) => (
                    <label key={field} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={t[field as keyof TxnInput] as boolean}
                        onChange={(e) => updateTxn(i, field as keyof TxnInput, e.target.checked)}
                        className="rounded border-border accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
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
            className="mt-4 flex items-center gap-2 bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? "Scoring..." : "Run Fraud Score"}
          </button>
        </div>

        {/* Results */}
        {results && summary && (
          <div className="flex flex-col gap-4">
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Scored", value: summary.scored_count },
                { label: "Flagged", value: summary.flagged_count },
                { label: "Flag Rate", value: `${(summary.flagged_rate * 100).toFixed(1)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-semibold font-mono text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Results grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Transaction list */}
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Results</p>
                </div>
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${selected === i ? "bg-primary/5" : "hover:bg-muted"}`}
                    >
                      <div>
                        <p className="text-xs font-mono text-foreground">{r.txn_id}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatScore(r.fraud_score)} fraud score</p>
                      </div>
                      <BandBadge band={r.fraud_band} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected detail */}
              {selectedResult && (
                <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Transaction</p>
                      <p className="text-sm font-mono text-foreground">{selectedResult.txn_id}</p>
                    </div>
                    <ScoreGauge
                      score={selectedResult.fraud_score}
                      label="Fraud Score"
                      band={selectedResult.fraud_band}
                      size={100}
                    />
                  </div>

                  <div>
                    <BandBadge band={selectedResult.fraud_band} label={`${selectedResult.fraud_band.toUpperCase()} RISK`} />
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedResult.human_summary}</p>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Key Factors</p>
                    <ReasonCard reasons={selectedResult.reasons} type="fraud" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Suggested Actions</p>
                    <ul className="flex flex-col gap-1.5">
                      {selectedResult.suggested_actions.map((a, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-0.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
