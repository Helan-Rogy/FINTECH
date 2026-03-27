# Phase 3: ML Risk Scoring - Evaluation Report

## Training Summary
- **Training Timestamp**: 2026-03-27T21:18:14.080274
- **Algorithm**: LogisticRegression (balanced class weights)
- **Total Records**: 10,000
- **Training Set**: 7,000
- **Test Set**: 3,000
- **Default Rate**: 16.90%

## Performance Metrics

### Classification Metrics
| Metric | Score |
|--------|-------|
| **ROC AUC (Train)** | 0.6562 |
| **ROC AUC (Test)** | 0.6596 |
| **PR AUC** | 0.2905 |
| **F1 Score** | 0.3543 |
| **Precision** | 0.2579 |
| **Recall** | 0.5661 |
| **Specificity** | 0.6687 |

### Confusion Matrix (Test Set)
| | Predicted Negative | Predicted Positive |
|---------|----------|---------|
| **Actual Negative** | 1,667 | 826 |
| **Actual Positive** | 220 | 287 |

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
[OK] Baseline quality metrics documented (ROC AUC: 0.6596, PR AUC: 0.2905)
[OK] Model artifact saved and ready for inference
[OK] Evaluation summary complete
