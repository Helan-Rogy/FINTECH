# Reason Codes Reference

## Fraud Detection Reason Codes

### Velocity (Fast Transaction Pattern)
- **FRD_VEL_HIGH**: High number of transactions in short time window (>4 in 24h)
- **FRD_VEL_BURST**: Transaction burst detected (sudden increase from baseline)
- **FRD_VEL_RAPID**: Unusually rapid consecutive transactions

### Amount Anomalies
- **FRD_AMT_DEVIATION**: Transaction amount significantly above/below user baseline
- **FRD_AMT_SPIKE**: Unusually large single transaction (>3 std devs from mean)
- **FRD_AMT_PATTERN**: Spending pattern change detected

### Merchant Risk
- **FRD_MERCHANT_NEW**: First transaction with this merchant
- **FRD_MERCHANT_CATEGORY**: High-risk merchant category identified
- **FRD_MERCHANT_FLAGGED**: Merchant in fraud watchlist

### Geographic Risk
- **FRD_GEO_NEW_CITY**: First transaction in this geographic location
- **FRD_GEO_NEW_COUNTRY**: First transaction in this country
- **FRD_GEO_MISMATCH**: Impossible travel distance/time detected (>500km in <4 hours)
- **FRD_GEO_JUMP**: Significant geographic jump from last transaction

### Device Risk
- **FRD_DEVICE_NEW**: First transaction from this device
- **FRD_DEVICE_UNUSUAL**: Device signature change detected
- **FRD_DEVICE_FLAGGED**: Device previously flagged for fraud

### Behavioral Risk
- **FRD_BEHAVIOR_CHANGE**: Significant deviation from user behavior profile
- **FRD_BEHAVIOR_TIME**: Unusual transaction time pattern
- **FRD_BEHAVIOR_MERCHANT_MIX**: Atypical merchant category mix

---

## Risk Scoring Reason Codes

### Income & Stability
- **RISK_INCOME_LOW**: Monthly income below threshold
- **RISK_INCOME_VOLATILE**: Income shows high variance
- **RISK_INCOME_DECLINING**: Income trend shows decline

### Employment History
- **RISK_EMPLOYMENT_SHORT**: Employment tenure less than threshold
- **RISK_EMPLOYMENT_GAPS**: Significant employment gaps detected
- **RISK_EMPLOYMENT_UNSTABLE**: Frequent job changes

### Credit Profile
- **RISK_CREDIT_NEW**: Limited credit history (< 6 months)
- **RISK_CREDIT_SHALLOW**: Short credit history but established
- **RISK_CREDIT_CLEAN**: No negative credit indicators

### Payment Behavior
- **RISK_PAYMENT_LATE**: Recent late payments in past 12 months
- **RISK_PAYMENT_MISSED**: Missed payment history
- **RISK_PAYMENT_CLEAN**: No payment issues

### Spending Patterns
- **RISK_SPEND_HIGH**: Monthly spending above 80% of income
- **RISK_SPEND_VOLATILE**: High month-to-month variance in spending
- **RISK_SPEND_RATIO**: Spend-to-income ratio exceeds safe threshold

### Profile Maturity
- **RISK_PROFILE_YOUNG**: Overall credit profile immaturity
- **RISK_PROFILE_ESTABLISHED**: Mature, established credit profile
- **RISK_PROFILE_RISKY**: Mix of risky indicators across dimensions

---

## Reason Code Severity Levels

### Fraud Codes
- **CRITICAL** (Major concern): FRD_GEO_MISMATCH, FRD_DEVICE_FLAGGED, FRD_MERCHANT_FLAGGED
- **HIGH**: FRD_VEL_BURST, FRD_AMT_SPIKE, FRD_GEO_JUMP, FRD_BEHAVIOR_CHANGE
- **MEDIUM**: FRD_VEL_HIGH, FRD_AMT_DEVIATION, FRD_MERCHANT_NEW, FRD_GEO_NEW_CITY
- **LOW**: FRD_BEHAVIOR_TIME, FRD_DEVICE_NEW

### Risk Codes
- **CRITICAL** (Major concern): RISK_PAYMENT_LATE, RISK_EMPLOYMENT_GAPS, RISK_INCOME_LOW
- **HIGH**: RISK_SPEND_HIGH, RISK_CREDIT_NEW, RISK_EMPLOYMENT_SHORT
- **MEDIUM**: RISK_INCOME_VOLATILE, RISK_SPEND_VOLATILE, RISK_PROFILE_YOUNG
- **LOW**: RISK_PAYMENT_CLEAN, RISK_CREDIT_CLEAN, RISK_PROFILE_ESTABLISHED

---

## Human-Readable Explanations

### Fraud Explanations Template
```
Transaction flagged as [BAND] fraud risk.

Key concerns:
- [Reason 1]: [Explanation specific to user context]
- [Reason 2]: [Explanation specific to user context]
- [Reason 3]: [Explanation specific to user context]

Suggested actions:
- Verify transaction details with customer
- [Specific action based on reason codes]
```

### Risk Explanations Template
```
[Subject] assigned [BAND] credit risk rating.

Key factors:
- [Factor 1]: [Numerical context]
- [Factor 2]: [Numerical context]
- [Factor 3]: [Numerical context]

Recommendation:
- [Specific recommendation based on profile]
```

---

## Integration Guidelines

Every prediction should include:
1. **Primary reason code** (highest severity/importance)
2. **Supporting reason codes** (top 2-3 contributors)
3. **Severity level** (CRITICAL/HIGH/MEDIUM/LOW)
4. **Context metrics** (relevant numerical values)
5. **Human-readable explanation** (non-technical language)
6. **Suggested actions** (next steps for reviewer/customer)

### JSON Report Structure
```json
{
  "prediction_id": "unique-id",
  "timestamp": "ISO-8601",
  "subject_id": "entity-id",
  "score": 0.75,
  "band": "medium",
  "confidence": 0.85,
  "primary_reason_code": "FRD_GEO_MISMATCH",
  "supporting_reasons": [
    {
      "code": "FRD_VEL_HIGH",
      "severity": "HIGH",
      "explanation": "5 transactions in 24 hours (user baseline: 1.2 per day)"
    },
    {
      "code": "FRD_MERCHANT_NEW",
      "severity": "MEDIUM",
      "explanation": "New electronics merchant"
    }
  ],
  "human_summary": "Transaction flagged due to rapid activity pattern and new merchant.",
  "suggested_actions": [
    "Contact customer to verify transaction",
    "Check for other unusual activity on account"
  ]
}
```

This schema ensures transparency, auditability, and helpful guidance for decision-makers.
