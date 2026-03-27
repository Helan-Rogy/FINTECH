## MVP Scope

### Product goal (MVP)
Ship a working web prototype that demonstrates:
- **Fraud detection** on transaction data (batch upload + optional “simulate stream”)
- **Risk scoring** (credit/default likelihood) with a simple low/med/high output
- **Transparency**: clear reasons behind fraud flags and risk decisions
- **Accessibility MVP**: chatbot-style explanations (voice is out-of-scope for MVP; stub only)

### Target users (MVP roles)
- **User**: uploads/selects sample data and views fraud alerts + risk score + explanation report
- **Analyst**: reviews flagged transactions, records decisions, adds notes
- **Admin**: manages demo accounts and has full visibility (can be merged with analyst for MVP)

### MVP flows (happy-path)
#### Flow A: User runs analysis
1) User logs in
2) User uploads/selects a dataset (transactions + optional credit/risk input)
3) System returns:
   - fraud scores + flagged transactions
   - risk score/band
   - explanation report

#### Flow B: Analyst case review
1) Analyst logs in
2) Analyst opens “Flagged transactions”
3) Analyst reviews top reasons and marks a decision (approve/escalate) with notes
4) Decision is stored and shown in an audit log

### In-scope features (must have)
- Fraud scoring endpoint and persistence of results
- Risk scoring endpoint and persistence of results
- Explanation payload with **top reasons** for both fraud and risk
- Analyst case queue + decision capture
- JWT auth (demo-grade)

### Out of scope (explicitly not MVP)
- Real banking/KYC integrations (Open Banking, Aadhaar/KYC, Twilio)
- True real-time streaming infra (Kafka, etc.) — emulate via batch + “replay”
- Offline-first support (can be a future-scope note)
- Voice STT/TTS production integration (UI stub only)
- Production-grade fairness/compliance certification (include only a short bias note)

### Entities (minimal data model)
- **User**: `id`, `email`, `role`, `created_at`
- **Transaction**: `txn_id`, `user_id`, `ts`, `amount`, `merchant_cat`, `merchant_id`, `city`, `country`, `device_id`
- **FraudResult**: `txn_id`, `fraud_score`, `fraud_band`, `reasons[]`, `created_at`
- **RiskResult**: `subject_id`, `risk_score`, `risk_band`, `reasons[]`, `created_at`
- **Report**: `id`, `user_id`, `summary`, `fraud_section`, `risk_section`, `created_at`
- **Case**: `id`, `txn_id`, `status`, `decision`, `notes`, `updated_by`, `updated_at`

### MVP acceptance criteria (demo checklist)
- One command starts the stack (later Phase 8)
- User can run analysis and see:
  - fraud flags + top reasons
  - risk band + top reasons
  - a readable report
- Analyst can mark decisions and see them persisted
