#!/usr/bin/env python3
"""
Phase 3: ML Risk Scoring - Inference Script

Loads trained risk model and applies it to new subject data.
Generates risk_score and risk_band for credit risk assessment.
"""

import pickle
from pathlib import Path

import pandas as pd


def load_model(model_path: str = "models/risk_model.pkl") -> dict:
    """Load trained model artifact."""
    with open(model_path, "rb") as f:
        artifact = pickle.load(f)
    return artifact


def engineer_inference_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer risk scoring features for inference.
    Applies same transformations as training.
    """
    df = df.copy()
    
    # Derived features (same as training)
    df["spend_to_income_ratio"] = (
        df["avg_monthly_spend"] / (df["income_monthly"] + 1)
    ).clip(0, 10)
    
    df["employment_stability"] = df["employment_years"] ** 1.5
    
    df["credit_to_employment_ratio"] = (
        df["credit_history_months"] / (df["employment_years"] * 12 + 1)
    ).clip(0, 2)
    
    df["has_late_payments"] = (df["late_payments_12m"] > 0).astype(int)
    
    return df


def score_subjects(
    df: pd.DataFrame,
    artifact: dict,
) -> pd.DataFrame:
    """
    Apply trained model to subject data.
    Returns DataFrame with risk_score and risk_band.
    """
    df = df.copy()
    
    # Engineer features
    df = engineer_inference_features(df)
    
    # Extract features for model
    feature_cols = artifact["feature_cols"]
    X = df[feature_cols].fillna(0)
    
    # Standardize
    scaler = artifact["scaler"]
    X_scaled = scaler.transform(X)
    
    # Get probability of default
    model = artifact["model"]
    risk_scores = model.predict_proba(X_scaled)[:, 1]  # Probability of default (class 1)
    
    # Assign bands
    import pandas as pd
    risk_bands = pd.cut(
        risk_scores,
        bins=[0, 0.3, 0.7, 1.0],
        labels=["low", "medium", "high"],
        include_lowest=True,
    )
    
    df["risk_score"] = risk_scores
    df["risk_band"] = risk_bands
    
    return df


def main():
    """Main inference workflow."""
    print("=" * 70)
    print("Phase 3: ML Risk Scoring - Inference")
    print("=" * 70)
    
    # Load model
    print("\n[1/3] Loading trained model...")
    artifact = load_model()
    print("✓ Model loaded successfully")
    print(f"  - Test AUC: {artifact['test_auc']:.4f}")
    
    # Load inference data
    print("\n[2/3] Loading subject data for scoring...")
    df_score = pd.read_csv("data/processed/risk_dataset.csv")
    print(f"✓ Loaded {len(df_score):,} subjects")
    
    # Score
    print("\n[3/3] Scoring subjects...")
    df_scored = score_subjects(df_score, artifact)
    
    # Save results
    output_path = "data/processed/risk_dataset_scored.csv"
    df_scored.to_csv(output_path, index=False)
    print(f"✓ Scored subjects saved to {output_path}")
    
    # Summary stats
    low_risk = (df_scored["risk_score"] < 0.3).sum()
    medium_risk = ((df_scored["risk_score"] >= 0.3) & (df_scored["risk_score"] < 0.7)).sum()
    high_risk = (df_scored["risk_score"] >= 0.7).sum()
    
    print("\n" + "=" * 70)
    print("Scoring Complete!")
    print("=" * 70)
    print(f"Low Risk:    {low_risk:,} ({100*low_risk/len(df_scored):.1f}%)")
    print(f"Medium Risk: {medium_risk:,} ({100*medium_risk/len(df_scored):.1f}%)")
    print(f"High Risk:   {high_risk:,} ({100*high_risk/len(df_scored):.1f}%)")
    print(f"\nMean risk score: {df_scored['risk_score'].mean():.4f}")
    print(f"Std risk score:  {df_scored['risk_score'].std():.4f}")


if __name__ == "__main__":
    main()
