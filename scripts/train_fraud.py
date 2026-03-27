#!/usr/bin/env python3
"""
Phase 2: ML Fraud Detection - Training Script

Builds and trains a fraud detection model using IsolationForest.
Features engineered: velocity, novelty, amount deviation, geo/device mismatch.
Outputs: trained model, fraud scores, and evaluation metrics.
"""

import json
import pickle
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def load_transaction_data(data_path: str) -> pd.DataFrame:
    """Load transaction CSV."""
    df = pd.read_csv(data_path)
    df["ts"] = pd.to_datetime(df["ts"])
    return df.sort_values("ts").reset_index(drop=True)


def engineer_fraud_features(df: pd.DataFrame, time_window_hours: int = 24) -> pd.DataFrame:
    """
    Engineer fraud detection features:
    - velocity: transaction count per user in time window
    - amount_deviation: z-score of amount within user's baseline
    - new_merchant: 1 if merchant is new to user
    - new_city: 1 if city is new to user
    - new_device: 1 if device is new to user
    - geo_mismatch: 1 if significant location jump detected
    """
    df = df.copy()
    
    # Feature 1: Velocity (txns per user in past 24h)
    df["velocity"] = 0
    for idx, row in df.iterrows():
        user_id = row["user_id"]
        current_ts = row["ts"]
        window_start = current_ts - timedelta(hours=time_window_hours)
        
        # Count transactions in window (excluding current)
        mask = (
            (df["user_id"] == user_id)
            & (df["ts"] >= window_start)
            & (df["ts"] < current_ts)
        )
        df.loc[idx, "velocity"] = mask.sum()
    
    # Feature 2: Amount deviation (z-score per user)
    df["amount_deviation"] = 0.0
    for user_id in df["user_id"].unique():
        user_mask = df["user_id"] == user_id
        user_amounts = df.loc[user_mask, "amount"]
        
        if len(user_amounts) > 1:
            mean = user_amounts.mean()
            std = user_amounts.std()
            if std > 0:
                z_scores = (df.loc[user_mask, "amount"] - mean) / std
                df.loc[user_mask, "amount_deviation"] = np.abs(z_scores)
    
    # Feature 3-5: Novelty (new merchant/city/device)
    df["new_merchant"] = 0
    df["new_city"] = 0
    df["new_device"] = 0
    
    for idx, row in df.iterrows():
        user_id = row["user_id"]
        
        # Get all prior transactions for this user (excluding current)
        prior_mask = (
            (df["user_id"] == user_id)
            & (df.index < idx)
        )
        prior_merchants = set(df.loc[prior_mask, "merchant_id"].unique())
        prior_cities = set(df.loc[prior_mask, "city"].unique())
        prior_devices = set(df.loc[prior_mask, "device_id"].unique())
        
        if row["merchant_id"] not in prior_merchants:
            df.loc[idx, "new_merchant"] = 1
        if row["city"] not in prior_cities:
            df.loc[idx, "new_city"] = 1
        if row["device_id"] not in prior_devices:
            df.loc[idx, "new_device"] = 1
    
    # Feature 6: Geo-mismatch (distance between consecutive txns)
    # Simplified: 1 if city changes and no time gap
    df["geo_mismatch"] = 0
    for user_id in df["user_id"].unique():
        user_mask = df["user_id"] == user_id
        user_df = df[user_mask].sort_values("ts").reset_index(drop=True)
        
        for i in range(1, len(user_df)):
            prev_city = user_df.iloc[i - 1]["city"]
            curr_city = user_df.iloc[i]["city"]
            time_gap = (
                user_df.iloc[i]["ts"] - user_df.iloc[i - 1]["ts"]
            ).total_seconds() / 3600  # hours
            
            # Assume ~500km per hour travel is suspicious (>4h to cross continent)
            if prev_city != curr_city and time_gap < 4:
                idx_global = df[user_mask].index[i]
                df.loc[idx_global, "geo_mismatch"] = 1
    
    return df


def train_fraud_model(df: pd.DataFrame, output_dir: str = "models") -> dict:
    """
    Train IsolationForest model on engineered features.
    Returns model artifact and evaluation metrics.
    """
    Path(output_dir).mkdir(exist_ok=True)
    
    feature_cols = [
        "velocity",
        "amount_deviation",
        "new_merchant",
        "new_city",
        "new_device",
        "geo_mismatch",
    ]
    
    X = df[feature_cols].fillna(0)
    
    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train IsolationForest (unsupervised anomaly detection)
    model = IsolationForest(
        contamination=0.05,  # Assume ~5% fraud rate
        random_state=42,
        n_estimators=100,
    )
    anomaly_scores = model.fit_predict(X_scaled)
    anomaly_distances = model.score_samples(X_scaled)
    
    # Calibrate anomaly scores to fraud_score (0-1)
    # IsolationForest score_samples: lower = more anomalous
    # Normalize to 0-1 range
    min_score = anomaly_distances.min()
    max_score = anomaly_distances.max()
    fraud_scores = 1 - ((anomaly_distances - min_score) / (max_score - min_score))
    
    # Fraud bands
    fraud_bands = pd.cut(
        fraud_scores,
        bins=[0, 0.3, 0.7, 1.0],
        labels=["low", "medium", "high"],
        include_lowest=True,
    )
    
    df["fraud_score"] = fraud_scores
    df["fraud_band"] = fraud_bands
    
    # Save model and scaler
    model_path = Path(output_dir) / "fraud_model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(
            {
                "model": model,
                "scaler": scaler,
                "feature_cols": feature_cols,
                "anomaly_distances": anomaly_distances,  # Store raw anomaly distances for calibration
                "fraud_scores": fraud_scores,  # Store calibrated scores for reference
            },
            f,
        )
    
    print(f"✓ Model saved to {model_path}")
    
    # Evaluation metrics
    high_risk = (fraud_scores >= 0.7).sum()
    medium_risk = ((fraud_scores >= 0.3) & (fraud_scores < 0.7)).sum()
    low_risk = (fraud_scores < 0.3).sum()
    
    metrics = {
        "total_transactions": len(df),
        "high_risk_count": int(high_risk),
        "medium_risk_count": int(medium_risk),
        "low_risk_count": int(low_risk),
        "high_risk_pct": round(100 * high_risk / len(df), 2),
        "medium_risk_pct": round(100 * medium_risk / len(df), 2),
        "low_risk_pct": round(100 * low_risk / len(df), 2),
        "mean_fraud_score": round(fraud_scores.mean(), 4),
        "std_fraud_score": round(fraud_scores.std(), 4),
        "training_timestamp": datetime.now().isoformat(),
    }
    
    return {
        "model_path": str(model_path),
        "dataframe": df,
        "metrics": metrics,
    }


def generate_evaluation_report(metrics: dict, output_path: str = "docs/fraud-eval.md") -> None:
    """Generate evaluation summary report."""
    Path(output_path).parent.mkdir(exist_ok=True)
    
    report = f"""# Phase 2: ML Fraud Detection - Evaluation Report

## Training Summary
- **Training Timestamp**: {metrics["training_timestamp"]}
- **Algorithm**: IsolationForest (contamination=0.05)
- **Total Transactions Analyzed**: {metrics["total_transactions"]:,}

## Risk Distribution

### Overall Statistics
| Metric | Value |
|--------|-------|
| Mean Fraud Score | {metrics["mean_fraud_score"]} |
| Std Fraud Score | {metrics["std_fraud_score"]} |

### Risk Band Distribution
| Band | Count | Percentage |
|------|-------|-----------|
| **High Risk** | {metrics["high_risk_count"]:,} | {metrics["high_risk_pct"]}% |
| **Medium Risk** | {metrics["medium_risk_count"]:,} | {metrics["medium_risk_pct"]}% |
| **Low Risk** | {metrics["low_risk_count"]:,} | {metrics["low_risk_pct"]}% |

## Feature Engineering

The model uses six engineered features:

1. **Velocity**: Transaction count per user in past 24 hours
   - HIGH: Rapid transaction bursts may indicate account compromise
   
2. **Amount Deviation**: Z-score of transaction amount within user baseline
   - HIGH: Unusual transaction amounts relative to user's history
   
3. **New Merchant**: Binary flag for first transaction with merchant
   - HIGH: New merchants increase fraud risk
   
4. **New City**: Binary flag for first transaction in city
   - HIGH: New geographies may indicate stolen card
   
5. **New Device**: Binary flag for first transaction from device
   - HIGH: New devices are higher risk
   
6. **Geo-Mismatch**: Rapid geographic movement (city change <4 hours)
   - HIGH: Physically impossible travel suggests fraud

## Model Artifact
- **Location**: `models/fraud_model.pkl`
- **Format**: Serialized Python pickle (includes IsolationForest, StandardScaler, feature list)
- **Size**: Model is lightweight and suitable for real-time inference

## Next Steps

1. Deploy `scripts/score_fraud.py` for real-time scoring
2. Monitor fraud band distribution over time
3. Collect ground truth labels to train supervised models (RandomForest, Gradient Boosting)
4. Perform A/B testing on fraud detection rules in production
5. Continuously retrain model on new transaction patterns

## Exit Criteria Status
[OK] Model runs on sample data end-to-end
[OK] Fraud scores and bands generated for all sample transactions
[OK] Model artifact saved and ready for inference
[OK] Evaluation summary complete
"""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"✓ Evaluation report generated: {output_path}")


def main():
    """Main training workflow."""
    print("=" * 70)
    print("Phase 2: ML Fraud Detection - Training")
    print("=" * 70)
    
    # Load data
    print("\n[1/4] Loading transaction data...")
    df = load_transaction_data("data/processed/transactions_sample.csv")
    print(f"✓ Loaded {len(df):,} transactions")
    
    # Engineer features
    print("\n[2/4] Engineering fraud features...")
    df = engineer_fraud_features(df)
    print(f"✓ Engineered 6 fraud features")
    print(f"  - velocity, amount_deviation, new_merchant, new_city, new_device, geo_mismatch")
    
    # Train model
    print("\n[3/4] Training IsolationForest model...")
    result = train_fraud_model(df)
    metrics = result["metrics"]
    df = result["dataframe"]
    
    print(f"✓ Model trained successfully")
    print(f"  - High Risk: {metrics['high_risk_count']:,} ({metrics['high_risk_pct']}%)")
    print(f"  - Medium Risk: {metrics['medium_risk_count']:,} ({metrics['medium_risk_pct']}%)")
    print(f"  - Low Risk: {metrics['low_risk_count']:,} ({metrics['low_risk_pct']}%)")
    
    # Generate report
    print("\n[4/4] Generating evaluation report...")
    generate_evaluation_report(metrics)
    
    # Save scored dataset
    scored_path = "data/processed/transactions_scored.csv"
    df.to_csv(scored_path, index=False)
    print(f"✓ Scored transactions saved to {scored_path}")
    
    print("\n" + "=" * 70)
    print("Phase 2 Training Complete!")
    print("=" * 70)
    print("\nNext: Run `python scripts/score_fraud.py` for inference on new data")


if __name__ == "__main__":
    main()
