# FraudShield - ML Fraud & Risk Detection Platform

## Overview
A web application demonstrating ML-powered fraud detection and credit risk scoring with explainable AI. Phases 1-4 (data pipeline + ML models + transparency engine) were pre-built; the web stack (phases 5-8) was implemented during Replit setup.

## Architecture

### Backend
- **Framework**: Flask (Python 3.12)
- **Entry point**: `app.py`
- **Port**: 5000 (0.0.0.0)
- **Production server**: Gunicorn

### Frontend
- **Type**: Vanilla HTML/CSS/JS single-page app
- **Location**: `frontend/index.html`
- **Served by**: Flask static files

### ML Models
- **Fraud model**: `models/fraud_model.pkl` - Isolation Forest anomaly detection
- **Risk model**: `models/risk_model.pkl` - Gradient Boosted classifier (probability of default)
- **Transparency**: `scripts/transparency_engine.py` - Human-readable explanations with reason codes

### Database
- **Type**: SQLite (`data/app.db`)
- **Tables**: `users`, `cases`

## API Endpoints
- `POST /auth/login` - Demo login (3 roles: user, analyst, admin)
- `POST /fraud/score` - Score transactions for fraud
- `POST /risk/score` - Score subjects for credit risk
- `GET /cases` - List fraud cases (analyst/admin)
- `POST /cases/:id/decision` - Record analyst decision
- `GET /reports/summary` - Pre-computed explanation summaries
- `GET /stats` - Dashboard statistics

## Demo Credentials
- **User**: user@demo.com
- **Analyst**: analyst@demo.com
- **Admin**: admin@demo.com

## Data
- `data/processed/` - Pre-processed CSV datasets (5k transactions, 10k risk subjects)
- `data/raw/` - Raw synthetic data
- `data/explanations/` - Pre-computed explanation JSON files

## Scripts
- `scripts/train_fraud.py` - Train fraud detection model
- `scripts/train_risk.py` - Train risk scoring model
- `scripts/score_fraud.py` - Score transactions (used by API)
- `scripts/score_risk.py` - Score subjects (used by API)
- `scripts/transparency_engine.py` - Generate explainable AI reports

## Implementation Phases
- Phases 1-4 (data, ML, transparency): Pre-built
- Phase 5 (backend API): Flask app in `app.py`
- Phase 6 (frontend): `frontend/index.html`
- Phases 7-8 (accessibility, devops): Partial

## Running
```bash
python app.py
```
Or in production:
```bash
gunicorn --bind=0.0.0.0:5000 --reuse-port app:app
```

## Dependencies
- flask, flask-cors, gunicorn
- pandas, scikit-learn, numpy
