## API Contracts (MVP)

### Conventions
- **Auth**: JWT in `Authorization: Bearer <token>`
- **Roles**: `user`, `analyst`, `admin`
- **Timestamps**: `YYYY-MM-DD HH:MM:SS` (UTC recommended)
- **IDs**: anonymized; no PII

---

## Auth

### `POST /auth/login`
Demo login (email/password or simple credentials).

**Request**

```json
{
  "email": "user@example.com",
  "password": "demo-password"
}
```

**Response (200)**

```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "u_00001",
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

## Fraud scoring

### `POST /fraud/score`
Scores transactions and returns per-transaction fraud results.

**Request** (either provide `dataset_id` OR inline `transactions`)

```json
{
  "dataset_id": "ds_00001",
  "options": {
    "top_k_reasons": 3
  }
}
```

**Response (200)**

```json
{
  "dataset_id": "ds_00001",
  "results": [
    {
      "txn_id": "t_00000001",
      "fraud_score": 0.91,
      "fraud_band": "high",
      "reasons": [
        {
          "code": "velocity_spike_1h",
          "message": "Unusually high transaction count in the last hour."
        },
        {
          "code": "new_country",
          "message": "Transaction country is new for this user."
        },
        {
          "code": "amount_deviation",
          "message": "Amount is far above the user’s typical range."
        }
      ]
    }
  ],
  "summary": {
    "scored_count": 20000,
    "flagged_count": 420,
    "flagged_rate": 0.021
  }
}
```

---

## Risk scoring

### `POST /risk/score`
Scores a subject’s risk profile (loan default likelihood) from features/alternative data.

**Request**

```json
{
  "subject_id": "s_00001",
  "features": {
    "income_monthly": 28000,
    "employment_years": 2.5,
    "credit_history_months": 18,
    "avg_monthly_spend": 19000,
    "late_payments_12m": 1
  },
  "options": {
    "top_k_reasons": 3
  }
}
```

**Response (200)**

```json
{
  "subject_id": "s_00001",
  "risk_score": 0.37,
  "risk_band": "medium",
  "reasons": [
    {
      "code": "short_credit_history",
      "message": "Short credit history increases uncertainty."
    },
    {
      "code": "income_vs_spend",
      "message": "Spending is high relative to income."
    },
    {
      "code": "recent_late_payment",
      "message": "Recent late payments increase risk."
    }
  ]
}
```

---

## Reports

### `GET /reports/:id`
Returns a user-friendly report combining fraud + risk + explanations.

**Response (200)**

```json
{
  "report_id": "r_00001",
  "user_id": "u_00001",
  "created_at": "2026-03-27 14:05:00",
  "summary": "We found a small number of unusual transactions and your risk level is medium.",
  "fraud_section": {
    "flagged_count": 420,
    "top_patterns": ["velocity_spike_1h", "new_country", "amount_deviation"]
  },
  "risk_section": {
    "risk_band": "medium",
    "top_factors": ["short_credit_history", "income_vs_spend", "recent_late_payment"]
  },
  "next_steps": [
    "Review the flagged transactions for unfamiliar activity.",
    "Keep spending within a comfortable range relative to income."
  ]
}
```

---

## Cases (Analyst)

### `GET /cases`
Returns case queue for analysts.

**Response (200)**

```json
{
  "cases": [
    {
      "case_id": "c_00001",
      "txn_id": "t_00000001",
      "status": "open",
      "fraud_score": 0.91,
      "fraud_band": "high",
      "updated_at": "2026-03-27 14:06:00"
    }
  ]
}
```

### `POST /cases/:id/decision`
Records an analyst decision.

**Request**

```json
{
  "decision": "escalate",
  "notes": "User has no prior travel pattern; confirm with user.",
  "status": "closed"
}
```

**Response (200)**

```json
{
  "case_id": "c_00001",
  "status": "closed",
  "decision": "escalate",
  "notes": "User has no prior travel pattern; confirm with user.",
  "updated_by": "u_00010",
  "updated_at": "2026-03-27 14:10:00"
}
```

---

## Error format (all endpoints)

**Response (4xx/5xx)**

```json
{
  "error": {
    "code": "bad_request",
    "message": "Missing required field: subject_id"
  }
}
```
