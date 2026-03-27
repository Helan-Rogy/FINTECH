# Phase 2 - ML Fraud Detection

## Objective
Build and validate an MVP fraud/anomaly model pipeline.

## Tasks
- Engineer fraud features (velocity, novelty, amount deviation, geo/device mismatch).
- Train baseline model:
  - Primary: IsolationForest
  - Optional (if labels): RandomForest or gradient boosting
- Calibrate outputs:
  - `fraud_score` (0-1)
  - `fraud_band` (low/med/high)
- Save model artifact and inference pipeline.

## Deliverables
- Training script (`scripts/train_fraud.py`)
- Inference script/service (`scripts/score_fraud.py`)
- Model artifact (`models/fraud_model.pkl`)
- Evaluation summary (`docs/fraud-eval.md`)

## Exit Criteria
- Model runs on sample data end-to-end.
- Fraud scores and bands are generated for all sample transactions.
