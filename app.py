#!/usr/bin/env python3
"""
Fraud & Risk Detection Web Application
Flask backend serving the API and static frontend.
"""

import json
import os
import sys
import pickle
import uuid
import sqlite3
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS

sys.path.insert(0, str(Path(__file__).parent))
from scripts.transparency_engine import FraudExplainer, RiskExplainer
from scripts.score_fraud import load_model as load_fraud_model, score_transactions, engineer_inference_features
from scripts.score_risk import load_model as load_risk_model, score_subjects

app = Flask(__name__, static_folder="frontend", static_url_path="")
CORS(app)

DATABASE = "data/app.db"

fraud_artifact = None
risk_artifact = None
fraud_explainer = FraudExplainer()
risk_explainer = RiskExplainer()

historical_transactions = None


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs("data", exist_ok=True)
    db = sqlite3.connect(DATABASE)
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            txn_id TEXT NOT NULL,
            fraud_score REAL,
            fraud_band TEXT,
            status TEXT DEFAULT 'open',
            decision TEXT,
            notes TEXT,
            updated_by TEXT,
            updated_at TEXT,
            created_at TEXT NOT NULL,
            details TEXT
        )
    """)
    db.execute("""
        INSERT OR IGNORE INTO users (id, email, role, created_at)
        VALUES (?, ?, ?, ?)
    """, ("demo-user-1", "user@demo.com", "user", datetime.utcnow().isoformat()))
    db.execute("""
        INSERT OR IGNORE INTO users (id, email, role, created_at)
        VALUES (?, ?, ?, ?)
    """, ("demo-analyst-1", "analyst@demo.com", "analyst", datetime.utcnow().isoformat()))
    db.execute("""
        INSERT OR IGNORE INTO users (id, email, role, created_at)
        VALUES (?, ?, ?, ?)
    """, ("demo-admin-1", "admin@demo.com", "admin", datetime.utcnow().isoformat()))
    db.commit()
    db.close()


def load_models():
    global fraud_artifact, risk_artifact, historical_transactions
    try:
        fraud_artifact = load_fraud_model("models/fraud_model.pkl")
        print("✓ Fraud model loaded")
    except Exception as e:
        print(f"✗ Failed to load fraud model: {e}")

    try:
        risk_artifact = load_risk_model("models/risk_model.pkl")
        print("✓ Risk model loaded")
    except Exception as e:
        print(f"✗ Failed to load risk model: {e}")

    try:
        historical_transactions = pd.read_csv("data/processed/transactions_sample.csv")
        historical_transactions["ts"] = pd.to_datetime(historical_transactions["ts"])
        print(f"✓ Historical transactions loaded ({len(historical_transactions):,} rows)")
    except Exception as e:
        print(f"✗ Failed to load historical data: {e}")


# ─── Frontend ────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("frontend", "index.html")


# ─── Auth endpoints ───────────────────────────────────────────────────────────

@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()

    role_map = {
        "user@demo.com": ("demo-user-1", "user"),
        "analyst@demo.com": ("demo-analyst-1", "analyst"),
        "admin@demo.com": ("demo-admin-1", "admin"),
    }

    if email not in role_map:
        return jsonify({"error": "Invalid credentials"}), 401

    user_id, role = role_map[email]
    return jsonify({
        "token": f"demo-token-{user_id}",
        "user": {"id": user_id, "email": email, "role": role}
    })


def _get_user_from_token(token):
    if not token:
        return None
    mapping = {
        "demo-token-demo-user-1": {"id": "demo-user-1", "email": "user@demo.com", "role": "user"},
        "demo-token-demo-analyst-1": {"id": "demo-analyst-1", "email": "analyst@demo.com", "role": "analyst"},
        "demo-token-demo-admin-1": {"id": "demo-admin-1", "email": "admin@demo.com", "role": "admin"},
    }
    return mapping.get(token)


# ─── Fraud scoring ────────────────────────────────────────────────────────────

@app.route("/fraud/score", methods=["POST"])
def fraud_score():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = _get_user_from_token(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if fraud_artifact is None:
        return jsonify({"error": "Fraud model not loaded"}), 503

    data = request.get_json(force=True)
    transactions = data.get("transactions", [])
    use_sample = data.get("use_sample", False)

    if use_sample:
        sample_df = pd.read_csv("data/processed/transactions_sample.csv")
        sample_df["ts"] = pd.to_datetime(sample_df["ts"])
        transactions_df = sample_df.head(20)
    elif transactions:
        transactions_df = pd.DataFrame(transactions)
        transactions_df["ts"] = pd.to_datetime(transactions_df["ts"])
    else:
        return jsonify({"error": "No transaction data provided"}), 400

    try:
        scored_df = score_transactions(transactions_df, fraud_artifact, historical_transactions)
    except Exception as e:
        return jsonify({"error": f"Scoring failed: {str(e)}"}), 500

    results = []
    db = get_db()
    for _, row in scored_df.iterrows():
        features = {
            "velocity": float(row.get("velocity", 0)),
            "amount_deviation": float(row.get("amount_deviation", 0)),
            "new_merchant": int(row.get("new_merchant", 0)),
            "new_city": int(row.get("new_city", 0)),
            "new_device": int(row.get("new_device", 0)),
            "geo_mismatch": int(row.get("geo_mismatch", 0)),
        }

        explanation = fraud_explainer.explain_prediction(
            subject_id=str(row.get("txn_id", "unknown")),
            fraud_score=float(row["fraud_score"]),
            fraud_band=str(row["fraud_band"]),
            features=features,
        )

        result = {
            "txn_id": str(row.get("txn_id", "unknown")),
            "amount": float(row.get("amount", 0)),
            "merchant_cat": str(row.get("merchant_cat", "")),
            "city": str(row.get("city", "")),
            "country": str(row.get("country", "")),
            "fraud_score": round(float(row["fraud_score"]), 4),
            "fraud_band": str(row["fraud_band"]),
            "explanation": {
                "primary_reason_code": explanation.primary_reason_code,
                "supporting_reasons": explanation.supporting_reasons,
                "human_summary": explanation.human_summary,
                "suggested_actions": explanation.suggested_actions,
                "confidence": round(explanation.confidence, 4),
            }
        }
        results.append(result)

        if str(row["fraud_band"]) in ("medium", "high"):
            case_id = str(uuid.uuid4())
            db.execute("""
                INSERT OR IGNORE INTO cases (id, txn_id, fraud_score, fraud_band, status, created_at, details)
                VALUES (?, ?, ?, ?, 'open', ?, ?)
            """, (
                case_id,
                str(row.get("txn_id", "unknown")),
                float(row["fraud_score"]),
                str(row["fraud_band"]),
                datetime.utcnow().isoformat(),
                json.dumps(result),
            ))
    db.commit()

    summary = {
        "total": len(results),
        "high": sum(1 for r in results if r["fraud_band"] == "high"),
        "medium": sum(1 for r in results if r["fraud_band"] == "medium"),
        "low": sum(1 for r in results if r["fraud_band"] == "low"),
        "avg_score": round(sum(r["fraud_score"] for r in results) / len(results), 4) if results else 0,
    }

    return jsonify({"results": results, "summary": summary})


# ─── Risk scoring ─────────────────────────────────────────────────────────────

@app.route("/risk/score", methods=["POST"])
def risk_score():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = _get_user_from_token(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if risk_artifact is None:
        return jsonify({"error": "Risk model not loaded"}), 503

    data = request.get_json(force=True)
    subjects = data.get("subjects", [])
    use_sample = data.get("use_sample", False)

    if use_sample:
        sample_df = pd.read_csv("data/processed/risk_dataset_sample.csv")
        subjects_df = sample_df.head(10)
    elif subjects:
        subjects_df = pd.DataFrame(subjects)
    else:
        return jsonify({"error": "No subject data provided"}), 400

    try:
        scored_df = score_subjects(subjects_df, risk_artifact)
    except Exception as e:
        return jsonify({"error": f"Scoring failed: {str(e)}"}), 500

    results = []
    for _, row in scored_df.iterrows():
        features = {
            "income_monthly": float(row.get("income_monthly", 0)),
            "employment_years": float(row.get("employment_years", 0)),
            "credit_history_months": float(row.get("credit_history_months", 0)),
            "avg_monthly_spend": float(row.get("avg_monthly_spend", 0)),
            "late_payments_12m": float(row.get("late_payments_12m", 0)),
            "spend_to_income_ratio": float(row.get("spend_to_income_ratio", 0)),
            "employment_stability": float(row.get("employment_stability", 0)),
            "has_late_payments": int(row.get("has_late_payments", 0)),
        }

        explanation = risk_explainer.explain_prediction(
            subject_id=str(row.get("subject_id", "unknown")),
            risk_score=float(row["risk_score"]),
            risk_band=str(row["risk_band"]),
            features=features,
        )

        result = {
            "subject_id": str(row.get("subject_id", "unknown")),
            "income_monthly": float(row.get("income_monthly", 0)),
            "employment_years": float(row.get("employment_years", 0)),
            "credit_history_months": float(row.get("credit_history_months", 0)),
            "risk_score": round(float(row["risk_score"]), 4),
            "risk_band": str(row["risk_band"]),
            "explanation": {
                "primary_reason_code": explanation.primary_reason_code,
                "supporting_reasons": explanation.supporting_reasons,
                "human_summary": explanation.human_summary,
                "suggested_actions": explanation.suggested_actions,
                "confidence": round(explanation.confidence, 4),
            }
        }
        results.append(result)

    summary = {
        "total": len(results),
        "high": sum(1 for r in results if r["risk_band"] == "high"),
        "medium": sum(1 for r in results if r["risk_band"] == "medium"),
        "low": sum(1 for r in results if r["risk_band"] == "low"),
        "avg_score": round(sum(r["risk_score"] for r in results) / len(results), 4) if results else 0,
    }

    return jsonify({"results": results, "summary": summary})


# ─── Cases ────────────────────────────────────────────────────────────────────

@app.route("/cases", methods=["GET"])
def get_cases():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = _get_user_from_token(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    status_filter = request.args.get("status")
    db = get_db()

    if status_filter:
        rows = db.execute(
            "SELECT * FROM cases WHERE status = ? ORDER BY created_at DESC",
            (status_filter,)
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM cases ORDER BY created_at DESC"
        ).fetchall()

    cases = []
    for row in rows:
        c = dict(row)
        if c.get("details"):
            try:
                c["details"] = json.loads(c["details"])
            except Exception:
                pass
        cases.append(c)

    return jsonify({"cases": cases, "total": len(cases)})


@app.route("/cases/<case_id>/decision", methods=["POST"])
def case_decision(case_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = _get_user_from_token(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if user["role"] not in ("analyst", "admin"):
        return jsonify({"error": "Forbidden - analyst or admin role required"}), 403

    data = request.get_json(force=True)
    decision = data.get("decision")
    notes = data.get("notes", "")

    if decision not in ("approve", "escalate", "dismiss"):
        return jsonify({"error": "Invalid decision. Must be approve, escalate, or dismiss"}), 400

    db = get_db()
    db.execute("""
        UPDATE cases
        SET decision = ?, notes = ?, status = 'closed', updated_by = ?, updated_at = ?
        WHERE id = ?
    """, (decision, notes, user["id"], datetime.utcnow().isoformat(), case_id))
    db.commit()

    if db.execute("SELECT changes()").fetchone()[0] == 0:
        return jsonify({"error": "Case not found"}), 404

    return jsonify({"success": True, "case_id": case_id, "decision": decision})


# ─── Reports ──────────────────────────────────────────────────────────────────

@app.route("/reports/summary", methods=["GET"])
def get_reports_summary():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = _get_user_from_token(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        fraud_summary_path = "data/explanations/fraud_explanation_summary.json"
        risk_summary_path = "data/explanations/risk_explanation_summary.json"
        fraud_summary = {}
        risk_summary = {}
        if os.path.exists(fraud_summary_path):
            with open(fraud_summary_path) as f:
                fraud_summary = json.load(f)
        if os.path.exists(risk_summary_path):
            with open(risk_summary_path) as f:
                risk_summary = json.load(f)
        return jsonify({"fraud": fraud_summary, "risk": risk_summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/stats", methods=["GET"])
def get_stats():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = _get_user_from_token(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db()
    total_cases = db.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
    open_cases = db.execute("SELECT COUNT(*) FROM cases WHERE status='open'").fetchone()[0]
    closed_cases = db.execute("SELECT COUNT(*) FROM cases WHERE status='closed'").fetchone()[0]
    high_risk_cases = db.execute("SELECT COUNT(*) FROM cases WHERE fraud_band='high'").fetchone()[0]

    return jsonify({
        "cases": {
            "total": total_cases,
            "open": open_cases,
            "closed": closed_cases,
            "high_risk": high_risk_cases,
        }
    })


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Loading ML models...")
    load_models()
    print("Starting web server on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=False)
