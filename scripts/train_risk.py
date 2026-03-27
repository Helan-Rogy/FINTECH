#!/usr/bin/env python3
"""
Phase 3: ML Risk Scoring - Training Script

Builds and trains a credit risk scoring model using LogisticRegression.
Features: income, employment, credit history, spending, payment behavior.
Outputs: trained model, risk scores, and evaluation metrics.
"""

import json
import pickle
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
    auc,
    f1_score,
    confusion_matrix,
)
from sklearn.preprocessing import StandardScaler


def load_risk_data(data_path: str) -> pd.DataFrame:
    """Load risk dataset CSV."""
    df = pd.read_csv(data_path)
    return df


def engineer_risk_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer risk scoring features from raw data.
    
    Features:
    - income_monthly: Monthly income (scale indicator)
    - employment_years: Employment tenure (stability)
    - credit_history_months: Credit history length (trustworthiness)
    - avg_monthly_spend: Spending relative to income
    - late_payments_12m: Recent payment issues (default predictor)
    - spend_to_income_ratio: Leverage ratio
    - employment_stability: Years of employment category
    - credit_to_age_ratio: Credit history relative to age
    """
    df = df.copy()
    
    # Feature derived from existing columns
    df["spend_to_income_ratio"] = (
        df["avg_monthly_spend"] / (df["income_monthly"] + 1)
    ).clip(0, 10)
    
    # Employment stability: tenure squared (longer tenure = lower risk exponentially)
    df["employment_stability"] = df["employment_years"] ** 1.5
    
    # Credit depth: credit history relative to typical work history
    df["credit_to_employment_ratio"] = (
        df["credit_history_months"] / (df["employment_years"] * 12 + 1)
    ).clip(0, 2)
    
    # Late payment risk indicator: binary flag for any late payment
    df["has_late_payments"] = (df["late_payments_12m"] > 0).astype(int)
    
    return df


def train_risk_model(
    df: pd.DataFrame,
    test_size: float = 0.3,
    random_state: int = 42,
    output_dir: str = "models",
) -> dict:
    """
    Train LogisticRegression model for risk scoring.
    Returns model artifact, metrics, and performance data.
    """
    Path(output_dir).mkdir(exist_ok=True)
    
    # Prepare features and target
    feature_cols = [
        "income_monthly",
        "employment_years",
        "credit_history_months",
        "avg_monthly_spend",
        "late_payments_12m",
        "spend_to_income_ratio",
        "employment_stability",
        "credit_to_employment_ratio",
        "has_late_payments",
    ]
    
    X = df[feature_cols].fillna(0)
    y = df["defaulted"]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    # Standardize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train LogisticRegression
    print(f"  Training on {len(X_train):,} samples...")
    model = LogisticRegression(
        max_iter=1000,
        random_state=random_state,
        solver="lbfgs",
        class_weight="balanced",  # Handle class imbalance
    )
    model.fit(X_train_scaled, y_train)
    
    # Predictions and probabilities
    y_train_pred_proba = model.predict_proba(X_train_scaled)[:, 1]
    y_test_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    y_test_pred = model.predict(X_test_scaled)
    
    # Evaluation metrics
    train_auc = roc_auc_score(y_train, y_train_pred_proba)
    test_auc = roc_auc_score(y_test, y_test_pred_proba)
    test_f1 = f1_score(y_test, y_test_pred)
    
    # Confusion matrix
    tn, fp, fn, tp = confusion_matrix(y_test, y_test_pred).ravel()
    
    # PR curve
    precision, recall, pr_thresholds = precision_recall_curve(y_test, y_test_pred_proba)
    pr_auc = auc(recall, precision)
    
    # ROC curve
    fpr, tpr, roc_thresholds = roc_curve(y_test, y_test_pred_proba)
    
    # Calibrate scores to 0-1 range
    risk_scores = y_test_pred_proba
    
    # Risk bands
    risk_bands = pd.cut(
        risk_scores,
        bins=[0, 0.3, 0.7, 1.0],
        labels=["low", "medium", "high"],
        include_lowest=True,
    )
    
    # Save model
    model_path = Path(output_dir) / "risk_model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(
            {
                "model": model,
                "scaler": scaler,
                "feature_cols": feature_cols,
                "train_auc": train_auc,
                "test_auc": test_auc,
                "roc_curve": (fpr, tpr, roc_thresholds),
                "pr_curve": (precision, recall, pr_thresholds),
            },
            f,
        )
    
    print(f"✓ Model saved to {model_path}")
    
    # Metrics summary
    metrics = {
        "total_records": len(df),
        "train_records": len(X_train),
        "test_records": len(X_test),
        "default_rate": float(y.mean()),
        "train_auc": float(train_auc),
        "test_auc": float(test_auc),
        "test_f1": float(test_f1),
        "pr_auc": float(pr_auc),
        "test_precision": float(tp / (tp + fp + 1e-10)),
        "test_recall": float(tp / (tp + fn + 1e-10)),
        "test_specificity": float(tn / (tn + fp + 1e-10)),
        "true_positives": int(tp),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "training_timestamp": datetime.now().isoformat(),
    }
    
    return {
        "model_path": str(model_path),
        "test_scores": (risk_scores, risk_bands),
        "metrics": metrics,
        "roc_data": (fpr, tpr),
    }


def generate_evaluation_report(
    metrics: dict, output_path: str = "docs/risk-eval.md"
) -> None:
    """Generate evaluation summary report."""
    Path(output_path).parent.mkdir(exist_ok=True)
    
    report = f"""# Phase 3: ML Risk Scoring - Evaluation Report

## Training Summary
- **Training Timestamp**: {metrics["training_timestamp"]}
- **Algorithm**: LogisticRegression (balanced class weights)
- **Total Records**: {metrics["total_records"]:,}
- **Training Set**: {metrics["train_records"]:,}
- **Test Set**: {metrics["test_records"]:,}
- **Default Rate**: {metrics["default_rate"]*100:.2f}%

## Performance Metrics

### Classification Metrics
| Metric | Score |
|--------|-------|
| **ROC AUC (Train)** | {metrics["train_auc"]:.4f} |
| **ROC AUC (Test)** | {metrics["test_auc"]:.4f} |
| **PR AUC** | {metrics["pr_auc"]:.4f} |
| **F1 Score** | {metrics["test_f1"]:.4f} |
| **Precision** | {metrics["test_precision"]:.4f} |
| **Recall** | {metrics["test_recall"]:.4f} |
| **Specificity** | {metrics["test_specificity"]:.4f} |

### Confusion Matrix (Test Set)
| | Predicted Negative | Predicted Positive |
|---------|----------|---------|
| **Actual Negative** | {metrics["true_negatives"]:,} | {metrics["false_positives"]:,} |
| **Actual Positive** | {metrics["false_negatives"]:,} | {metrics["true_positives"]:,} |

## Feature Engineering

The model uses 9 risk features:

1. **income_monthly**: Monthly income (raw feature)
   - Higher income typically indicates lower default risk
   
2. **employment_years**: Employment tenure (raw feature)
   - Longer employment = greater stability
   
3. **credit_history_months**: Credit history length (raw feature)
   - Longer history = more established credit profile
   
4. **avg_monthly_spend**: Average monthly spending (raw feature)
   - Spending pattern relative to income
   
5. **late_payments_12m**: Recent late payments in past year (raw feature)
   - Strong predictor of default risk
   
6. **spend_to_income_ratio**: Spending as % of income (derived)
   - Leverage ratio indicating financial stress
   
7. **employment_stability**: Employment tenure cubed (derived)
   - Exponential stability factor from tenure
   
8. **credit_to_employment_ratio**: Credit history vs. employment (derived)
   - Depth of credit relative to work history
   
9. **has_late_payments**: Binary flag for any late payment (derived)
   - Binary indicator of recent payment issues

## Model Characteristics

- **Algorithm Type**: Logistic Regression (linear probability model)
- **Regularization**: L2 (Ridge)
- **Class Weights**: Balanced to handle imbalanced dataset
- **Feature Scaling**: StandardScaler (zero mean, unit variance)
- **Calibration**: Probability-based scores (0-1)

## Risk Scoring

### Risk Bands
- **Low Risk**: score < 0.3
- **Medium Risk**: 0.3 <= score < 0.7
- **High Risk**: score >= 0.7

## Output Format

Inference produces:
- `risk_score`: Probability of default (0-1)
- `risk_band`: Categorical risk level (low/medium/high)

## Model Artifact
- **Location**: `models/risk_model.pkl`
- **Contents**: LogisticRegression model, StandardScaler, feature columns, ROC curve data
- **Size**: Lightweight, suitable for real-time inference

## Interpretation

The model provides interpretable risk scores based on creditworthiness factors:
- Income stability and history
- Employment tenure and stability
- Spending patterns relative to income
- Payment behavior

Higher scores indicate higher default risk.

## Next Steps

1. Deploy `scripts/score_risk.py` for real-time risk assessment
2. Monitor risk score distributions over time
3. Validate against actual default outcomes
4. Consider ensemble methods (e.g., XGBoost) for improved performance
5. Implement feature monitoring for data drift
6. Set risk thresholds based on business requirements

## Exit Criteria Status
[OK] Risk outputs generated for all test samples
[OK] Baseline quality metrics documented (ROC AUC: {metrics["test_auc"]:.4f}, PR AUC: {metrics["pr_auc"]:.4f})
[OK] Model artifact saved and ready for inference
[OK] Evaluation summary complete
"""
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"✓ Evaluation report generated: {output_path}")


def main():
    """Main training workflow."""
    print("=" * 70)
    print("Phase 3: ML Risk Scoring - Training")
    print("=" * 70)
    
    # Load data
    print("\n[1/4] Loading risk dataset...")
    df = load_risk_data("data/processed/risk_dataset.csv")
    print(f"✓ Loaded {len(df):,} records")
    print(f"  Default rate: {df['defaulted'].mean()*100:.2f}%")
    
    # Engineer features
    print("\n[2/4] Engineering risk features...")
    df = engineer_risk_features(df)
    print(f"✓ Engineered 9 risk features")
    print(f"  - income, employment, credit history, spending, payment behavior")
    print(f"  - derived: ratios, stability, flags")
    
    # Train model
    print("\n[3/4] Training LogisticRegression model...")
    result = train_risk_model(df)
    metrics = result["metrics"]
    
    print(f"✓ Model trained successfully")
    print(f"  - Train AUC: {metrics['train_auc']:.4f}")
    print(f"  - Test AUC: {metrics['test_auc']:.4f}")
    print(f"  - F1 Score: {metrics['test_f1']:.4f}")
    print(f"  - PR AUC: {metrics['pr_auc']:.4f}")
    
    # Generate report
    print("\n[4/4] Generating evaluation report...")
    generate_evaluation_report(metrics)
    
    print("\n" + "=" * 70)
    print("Phase 3 Training Complete!")
    print("=" * 70)
    print("\nNext: Run `python scripts/score_risk.py` for inference on new data")


if __name__ == "__main__":
    main()
