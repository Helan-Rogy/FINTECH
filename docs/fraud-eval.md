# Phase 2: ML Fraud Detection - Evaluation Report

## Training Summary
- **Training Timestamp**: 2026-03-27T21:04:01.872964
- **Algorithm**: IsolationForest (contamination=0.05)
- **Total Transactions Analyzed**: 5,000

## Risk Distribution

### Overall Statistics
| Metric | Value |
|--------|-------|
| Mean Fraud Score | 0.2189 |
| Std Fraud Score | 0.1945 |

### Risk Band Distribution
| Band | Count | Percentage |
|------|-------|-----------|
| **High Risk** | 223 | 4.46% |
| **Medium Risk** | 885 | 17.7% |
| **Low Risk** | 3,892 | 77.84% |

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
