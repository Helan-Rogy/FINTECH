# Phase 3 - ML Risk Scoring

## Objective
Build a credit/risk scoring model with interpretable outputs.

## Tasks
- Prepare risk features and label from the risk dataset.
- Train baseline model:
  - Primary: LogisticRegression
  - Optional improvement: XGBoost
- Calibrate outputs:
  - `risk_score` (0-1)
  - `risk_band` (low/med/high)
- Store model artifact and reproducible inference path.

## Deliverables
- Training script (`scripts/train_risk.py`)
- Inference script/service (`scripts/score_risk.py`)
- Model artifact (`models/risk_model.pkl`)
- Evaluation summary (`docs/risk-eval.md`)

## Exit Criteria
- Risk outputs generated for all test samples.
- Baseline quality metrics documented (AUC/PR or equivalent).
