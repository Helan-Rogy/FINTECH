#!/usr/bin/env python3
"""
Phase 2: ML Fraud Detection - Inference Script

Loads trained fraud model and applies it to new transaction data.
Generates fraud_score and fraud_band for scoring transactions in production.
"""

import pickle
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd


def load_model(model_path: str = "models/fraud_model.pkl") -> dict:
    """Load trained model artifact."""
    with open(model_path, "rb") as f:
        artifact = pickle.load(f)
    return artifact


def engineer_inference_features(
    df: pd.DataFrame,
    historical_df: pd.DataFrame = None,
    time_window_hours: int = 24,
) -> pd.DataFrame:
    """
    Engineer fraud detection features for inference.
    If historical_df provided, uses actual historical data for novelty detection.
    Otherwise, uses conservative approach (flag everything as novel).
    """
    df = df.copy()
    
    # Feature 1: Velocity
    df["velocity"] = 0
    if historical_df is not None:
        for idx, row in df.iterrows():
            user_id = row["user_id"]
            current_ts = row["ts"]
            window_start = current_ts - timedelta(hours=time_window_hours)
            
            # Count transactions in window
            mask = (
                (historical_df["user_id"] == user_id)
                & (historical_df["ts"] >= window_start)
                & (historical_df["ts"] < current_ts)
            )
            df.loc[idx, "velocity"] = mask.sum()
    
    # Feature 2: Amount deviation (per-user z-score)
    df["amount_deviation"] = 0.0
    if historical_df is not None:
        for user_id in df["user_id"].unique():
            if user_id in historical_df["user_id"].values:
                user_amounts = historical_df[
                    historical_df["user_id"] == user_id
                ]["amount"]
                mean = user_amounts.mean()
                std = user_amounts.std()
                
                if std > 0:
                    z_scores = np.abs((df[df["user_id"] == user_id]["amount"] - mean) / std)
                    df.loc[df["user_id"] == user_id, "amount_deviation"] = z_scores
    
    # Features 3-5: Novelty
    df["new_merchant"] = 0
    df["new_city"] = 0
    df["new_device"] = 0
    
    if historical_df is not None:
        for idx, row in df.iterrows():
            user_id = row["user_id"]
            
            user_historical = historical_df[historical_df["user_id"] == user_id]
            prior_merchants = set(user_historical["merchant_id"].unique())
            prior_cities = set(user_historical["city"].unique())
            prior_devices = set(user_historical["device_id"].unique())
            
            if row["merchant_id"] not in prior_merchants:
                df.loc[idx, "new_merchant"] = 1
            if row["city"] not in prior_cities:
                df.loc[idx, "new_city"] = 1
            if row["device_id"] not in prior_devices:
                df.loc[idx, "new_device"] = 1
    else:
        # Conservative: no history, flag everything as potentially novel
        df["new_merchant"] = 1
        df["new_city"] = 1
        df["new_device"] = 1
    
    # Feature 6: Geo-mismatch
    df["geo_mismatch"] = 0
    if historical_df is not None:
        # Compare new transactions to most recent user transaction
        for idx, row in df.iterrows():
            user_id = row["user_id"]
            user_historical = historical_df[
                historical_df["user_id"] == user_id
            ].sort_values("ts")
            
            if len(user_historical) > 0:
                last_city = user_historical.iloc[-1]["city"]
                time_gap = (row["ts"] - user_historical.iloc[-1]["ts"]).total_seconds() / 3600
                
                if row["city"] != last_city and time_gap < 4:
                    df.loc[idx, "geo_mismatch"] = 1
    
    return df


def score_transactions(
    df: pd.DataFrame,
    artifact: dict,
    historical_df: pd.DataFrame = None,
) -> pd.DataFrame:
    """
    Apply trained model to transaction data.
    Returns DataFrame with fraud_score and fraud_band.
    """
    df = df.copy()
    df["ts"] = pd.to_datetime(df["ts"])
    
    # Engineer features
    df = engineer_inference_features(df, historical_df)
    
    # Extract features for model
    feature_cols = artifact["feature_cols"]
    X = df[feature_cols].fillna(0)
    
    # Standardize
    scaler = artifact["scaler"]
    X_scaled = scaler.transform(X)
    
    # Get anomaly scores
    model = artifact["model"]
    anomaly_distances = model.score_samples(X_scaled)
    
    # Calibrate to fraud scores (0-1) using training anomaly distances
    training_anom_distances = artifact["anomaly_distances"]
    
    # Use percentiles from training for robust calibration
    min_anom = np.percentile(training_anom_distances, 5)
    max_anom = np.percentile(training_anom_distances, 95)
    
    # Linear rescaling: lower anomaly distance = higher fraud score
    fraud_scores = 1 - ((anomaly_distances - min_anom) / (max_anom - min_anom + 1e-10))
    fraud_scores = np.clip(fraud_scores, 0, 1)
    
    # Assign bands
    fraud_bands = pd.cut(
        fraud_scores,
        bins=[0, 0.3, 0.7, 1.0],
        labels=["low", "medium", "high"],
        include_lowest=True,
    )
    
    df["fraud_score"] = fraud_scores
    df["fraud_band"] = fraud_bands
    
    return df


def main():
    """Main inference workflow."""
    print("=" * 70)
    print("Phase 2: ML Fraud Detection - Inference")
    print("=" * 70)
    
    # Load model
    print("\n[1/3] Loading trained model...")
    artifact = load_model()
    print("✓ Model loaded successfully")
    
    # Load inference data
    print("\n[2/3] Loading transaction data for scoring...")
    df_score = pd.read_csv("data/processed/transactions_full.csv")
    df_score["ts"] = pd.to_datetime(df_score["ts"])
    print(f"✓ Loaded {len(df_score):,} transactions")
    
    # Load historical data for feature engineering
    df_historical = pd.read_csv("data/processed/transactions_sample.csv")
    df_historical["ts"] = pd.to_datetime(df_historical["ts"])
    print(f"✓ Loaded {len(df_historical):,} historical transactions")
    
    # Score
    print("\n[3/3] Scoring transactions...")
    df_scored = score_transactions(df_score, artifact, df_historical)
    
    # Save results
    output_path = "data/processed/transactions_full_scored.csv"
    df_scored.to_csv(output_path, index=False)
    print(f"✓ Scored transactions saved to {output_path}")
    
    # Summary stats
    high_risk = (df_scored["fraud_score"] >= 0.7).sum()
    medium_risk = ((df_scored["fraud_score"] >= 0.3) & (df_scored["fraud_score"] < 0.7)).sum()
    low_risk = (df_scored["fraud_score"] < 0.3).sum()
    
    print("\n" + "=" * 70)
    print("Scoring Complete!")
    print("=" * 70)
    print(f"High Risk:   {high_risk:,} ({100*high_risk/len(df_scored):.1f}%)")
    print(f"Medium Risk: {medium_risk:,} ({100*medium_risk/len(df_scored):.1f}%)")
    print(f"Low Risk:    {low_risk:,} ({100*low_risk/len(df_scored):.1f}%)")
    print(f"\nMean fraud score: {df_scored['fraud_score'].mean():.4f}")


if __name__ == "__main__":
    main()
