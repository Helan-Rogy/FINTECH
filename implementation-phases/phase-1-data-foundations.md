# Phase 1 - Data Foundations

## Objective
Prepare clean, repeatable datasets for fraud and risk modeling.

## Tasks
- Finalize transaction schema:
  - `txn_id,user_id,ts,amount,merchant_cat,merchant_id,city,country,device_id`
- Keep identifiers anonymized (`u_`, `m_`, `d_` token mapping).
- Standardize risk dataset columns (target label + model features).
- Add validation checks (duplicates, nulls, parse errors, schema conformance).

## Deliverables
- `data/processed/transactions_full.csv`
- `data/processed/transactions_sample.csv`
- `data/processed/risk_dataset.csv`
- ETL scripts + mapping configs in `scripts/` and `config/`

## Exit Criteria
- Datasets are reproducibly generated from one command per dataset.
- Validation checks pass with no critical errors.
