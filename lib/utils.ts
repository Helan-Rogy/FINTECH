import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function bandColor(band: "low" | "medium" | "high") {
  return {
    low: "text-success",
    medium: "text-warning",
    high: "text-destructive",
  }[band];
}

export function bandBg(band: "low" | "medium" | "high") {
  return {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    high: "bg-destructive/10 text-destructive border-destructive/20",
  }[band];
}

export function formatScore(score: number) {
  return (score * 100).toFixed(1) + "%";
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const FRAUD_REASON_LABELS: Record<string, string> = {
  FRD_VEL_HIGH: "High velocity",
  FRD_VEL_BURST: "Transaction burst",
  FRD_VEL_RAPID: "Rapid transactions",
  FRD_AMT_DEVIATION: "Amount deviation",
  FRD_AMT_SPIKE: "Amount spike",
  FRD_AMT_PATTERN: "Spending pattern change",
  FRD_MERCHANT_NEW: "New merchant",
  FRD_MERCHANT_CATEGORY: "High-risk merchant",
  FRD_MERCHANT_FLAGGED: "Flagged merchant",
  FRD_GEO_NEW_CITY: "New city",
  FRD_GEO_NEW_COUNTRY: "New country",
  FRD_GEO_MISMATCH: "Impossible travel",
  FRD_GEO_JUMP: "Geographic jump",
  FRD_DEVICE_NEW: "New device",
  FRD_DEVICE_UNUSUAL: "Unusual device",
  FRD_DEVICE_FLAGGED: "Flagged device",
  FRD_BEHAVIOR_CHANGE: "Behavior change",
  FRD_BEHAVIOR_TIME: "Unusual time",
  FRD_BEHAVIOR_MERCHANT_MIX: "Atypical merchant mix",
};

export const RISK_REASON_LABELS: Record<string, string> = {
  RISK_INCOME_LOW: "Low income",
  RISK_INCOME_VOLATILE: "Volatile income",
  RISK_INCOME_DECLINING: "Declining income",
  RISK_EMPLOYMENT_SHORT: "Short employment",
  RISK_EMPLOYMENT_GAPS: "Employment gaps",
  RISK_EMPLOYMENT_UNSTABLE: "Unstable employment",
  RISK_CREDIT_NEW: "New credit profile",
  RISK_CREDIT_SHALLOW: "Shallow credit history",
  RISK_CREDIT_CLEAN: "Clean credit",
  RISK_PAYMENT_LATE: "Late payments",
  RISK_PAYMENT_MISSED: "Missed payments",
  RISK_PAYMENT_CLEAN: "Clean payment history",
  RISK_SPEND_HIGH: "High spending",
  RISK_SPEND_VOLATILE: "Volatile spending",
  RISK_SPEND_RATIO: "High spend-to-income",
  RISK_PROFILE_YOUNG: "Young credit profile",
  RISK_PROFILE_ESTABLISHED: "Established profile",
  RISK_PROFILE_RISKY: "Risky profile mix",
};
