#!/usr/bin/env python3
"""
Phase 4: Risk Score Explanation Generator

Generates human-readable explanations for risk scoring predictions.
Produces JSON reports with reason codes and suggested actions.
"""

import json
from pathlib import Path

import pandas as pd
from transparency_engine import RiskExplainer, ReportGenerator


def generate_risk_explanations(
    scored_data_path: str = "data/processed/risk_dataset_scored.csv",
    output_dir: str = "data/explanations",
    sample_size: int = None,
) -> None:
    """
    Generate risk explanations for scored subjects.
    
    Args:
        scored_data_path: Path to scored risk dataset CSV
        output_dir: Directory to save explanation reports
        sample_size: Limit to N rows (for testing), None = all
    """
    Path(output_dir).mkdir(exist_ok=True)
    
    # Load scored data
    print(f"[1/4] Loading scored risk data...")
    df = pd.read_csv(scored_data_path)
    
    if sample_size:
        df = df.head(sample_size)
    
    print(f"✓ Loaded {len(df):,} subjects")
    
    # Initialize explainer
    print(f"\n[2/4] Generating explanations...")
    explainer = RiskExplainer()
    
    explanations = []
    high_risk_explanations = []
    
    for idx, row in df.iterrows():
        # Prepare features
        features = {
            "income_monthly": row.get("income_monthly", 0),
            "employment_years": row.get("employment_years", 0),
            "credit_history_months": row.get("credit_history_months", 0),
            "avg_monthly_spend": row.get("avg_monthly_spend", 0),
            "late_payments_12m": row.get("late_payments_12m", 0),
            "spend_to_income_ratio": row.get("spend_to_income_ratio", 0),
            "employment_stability": row.get("employment_stability", 0),
            "credit_to_employment_ratio": row.get("credit_to_employment_ratio", 0),
            "has_late_payments": row.get("has_late_payments", 0),
        }
        
        # Generate explanation
        report = explainer.explain_prediction(
            subject_id=str(row["subject_id"]),
            risk_score=row["risk_score"],
            risk_band=str(row["risk_band"]),
            features=features,
        )
        
        # Convert to dictionary
        explanation_dict = ReportGenerator.to_dict(report)
        explanations.append(explanation_dict)
        
        # Track high risk
        if str(row["risk_band"]) == "high":
            high_risk_explanations.append(explanation_dict)
        
        # Progress update
        if (idx + 1) % 1000 == 0:
            print(f"  Processed {idx + 1:,} subjects...")
    
    print(f"✓ Generated {len(explanations):,} explanations")
    
    # Save all explanations
    print(f"\n[3/4] Saving explanations...")
    all_path = Path(output_dir) / "risk_explanations_all.json"
    with open(all_path, "w", encoding="utf-8") as f:
        json.dump(explanations, f, indent=2, default=str)
    print(f"✓ Saved all explanations: {all_path}")
    
    # Save high-risk explanations separately
    high_path = Path(output_dir) / "risk_explanations_high_risk.json"
    with open(high_path, "w", encoding="utf-8") as f:
        json.dump(high_risk_explanations, f, indent=2, default=str)
    print(f"✓ Saved {len(high_risk_explanations)} high-risk explanations: {high_path}")
    
    # Generate summary statistics
    print(f"\n[4/4] Generating summary statistics...")
    
    summary_stats = {
        "total_subjects": len(explanations),
        "high_risk_count": len(high_risk_explanations),
        "high_risk_percentage": round(100 * len(high_risk_explanations) / len(explanations), 2),
        "average_confidence": round(sum(e["confidence"] for e in explanations) / len(explanations), 4),
        "top_reason_codes": _get_top_reason_codes(explanations, top_n=10),
    }
    
    stats_path = Path(output_dir) / "risk_explanation_summary.json"
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(summary_stats, f, indent=2)
    print(f"✓ Generated summary statistics")
    
    print("\n" + "=" * 70)
    print("Risk Explanation Generation Complete!")
    print("=" * 70)
    print(f"\nTotal Subjects: {summary_stats['total_subjects']:,}")
    print(f"High Risk: {summary_stats['high_risk_count']:,} ({summary_stats['high_risk_percentage']}%)")
    print(f"Avg Confidence: {summary_stats['average_confidence']:.4f}")
    print(f"\nTop Reason Codes:")
    for code, count in summary_stats["top_reason_codes"]:
        print(f"  {code}: {count}")


def _get_top_reason_codes(explanations: list, top_n: int = 10) -> list:
    """Get top N reason codes by frequency."""
    reason_code_counts = {}
    
    for exp in explanations:
        primary = exp.get("primary_reason_code")
        if primary:
            reason_code_counts[primary] = reason_code_counts.get(primary, 0) + 1
        
        for supporting in exp.get("supporting_reasons", []):
            code = supporting.get("code")
            if code:
                reason_code_counts[code] = reason_code_counts.get(code, 0) + 1
    
    # Sort by frequency
    sorted_codes = sorted(
        reason_code_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    return sorted_codes[:top_n]


class RiskExplanationService:
    """Service for on-demand risk explanation generation."""
    
    def __init__(self):
        self.explainer = RiskExplainer()
    
    def explain_subject(
        self,
        subject_id: str,
        risk_score: float,
        risk_band: str,
        features: dict,
    ) -> dict:
        """Generate explanation for a single subject."""
        report = self.explainer.explain_prediction(
            subject_id=subject_id,
            risk_score=risk_score,
            risk_band=risk_band,
            features=features,
        )
        return ReportGenerator.to_dict(report)


if __name__ == "__main__":
    generate_risk_explanations(sample_size=None)
