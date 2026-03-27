-- FINTECH Platform - Database Schema
-- Phase 5: Backend API Data Layer

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','analyst','admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datasets (uploaded or sample)
CREATE TABLE IF NOT EXISTS datasets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('fraud','risk','both')),
  record_count INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fraud predictions
CREATE TABLE IF NOT EXISTS fraud_predictions (
  id              TEXT PRIMARY KEY,
  dataset_id      TEXT REFERENCES datasets(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  txn_id          TEXT NOT NULL,
  fraud_score     FLOAT NOT NULL,
  fraud_band      TEXT NOT NULL CHECK (fraud_band IN ('low','medium','high')),
  confidence      FLOAT,
  primary_reason  TEXT,
  reasons         JSONB,
  human_summary   TEXT,
  suggested_actions JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Risk predictions
CREATE TABLE IF NOT EXISTS risk_predictions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  subject_id      TEXT NOT NULL,
  risk_score      FLOAT NOT NULL,
  risk_band       TEXT NOT NULL CHECK (risk_band IN ('low','medium','high')),
  confidence      FLOAT,
  primary_reason  TEXT,
  reasons         JSONB,
  human_summary   TEXT,
  suggested_actions JSONB,
  features        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports (combined fraud + risk per user session)
CREATE TABLE IF NOT EXISTS reports (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  dataset_id      TEXT REFERENCES datasets(id),
  summary         TEXT,
  fraud_section   JSONB,
  risk_section    JSONB,
  next_steps      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analyst cases
CREATE TABLE IF NOT EXISTS cases (
  id              TEXT PRIMARY KEY,
  txn_id          TEXT NOT NULL,
  prediction_id   TEXT REFERENCES fraud_predictions(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  fraud_score     FLOAT,
  fraud_band      TEXT,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','escalated')),
  decision        TEXT CHECK (decision IN ('clear','escalate','block',NULL)),
  notes           TEXT,
  updated_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed demo users (passwords are bcrypt of 'demo-password')
-- Using a well-known bcrypt hash for 'demo-password' for seeding purposes
INSERT INTO users (id, email, password_hash, role) VALUES
  ('u_00001', 'user@demo.com',    '$2b$10$9xGoRm7QGk1Ax4WlQHxrMeodP/vp4aLkTEzgqvBnPeYRpFVGBe8oq', 'user'),
  ('u_00010', 'analyst@demo.com', '$2b$10$9xGoRm7QGk1Ax4WlQHxrMeodP/vp4aLkTEzgqvBnPeYRpFVGBe8oq', 'analyst'),
  ('u_00099', 'admin@demo.com',   '$2b$10$9xGoRm7QGk1Ax4WlQHxrMeodP/vp4aLkTEzgqvBnPeYRpFVGBe8oq', 'admin')
ON CONFLICT (id) DO NOTHING;
