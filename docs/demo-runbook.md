# FinTech AI Platform — Demo Runbook

This document describes how to run a complete end-to-end demo of the platform.

---

## Prerequisites

- Node.js 18+ and npm/pnpm installed
- Neon database connected (via Vercel integration or `DATABASE_URL` in `.env.local`)
- Database migration and seed executed (see Setup below)

---

## Setup (first time only)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Edit .env.local and set DATABASE_URL and JWT_SECRET
```

### 3. Run database migration
Execute `scripts/migrate.sql` against your Neon database.

On Vercel, this is done via the v0 script runner.
Locally:
```bash
psql $DATABASE_URL -f scripts/migrate.sql
```

### 4. Seed demo data
```bash
psql $DATABASE_URL -f scripts/seed-demo.sql
```

### 5. Start the development server
```bash
npm run dev
```

Visit: http://localhost:3000

---

## Demo Accounts

| Role    | Email               | Password       | Redirect        |
|---------|---------------------|----------------|-----------------|
| User    | user@demo.com       | demo-password  | /dashboard      |
| Analyst | analyst@demo.com    | demo-password  | /analyst        |
| Admin   | admin@demo.com      | demo-password  | /analyst        |

---

## Demo Flow

### Flow A — End User (user@demo.com)

1. **Login** at `/login` → click the "User" demo button → Sign in
2. **Dashboard** — shows KPI stats (fraud scored, risk assessments, reports)
3. **Fraud Check** `/dashboard/fraud`
   - Leave defaults or toggle flags (New Country, Geo Mismatch)
   - Click "Run Fraud Score"
   - Click a transaction result to see the score gauge, reasons, and suggested actions
   - Click "Show simplified view" to see the accessibility-friendly plain-language view
   - Click the blue chat bubble (bottom right) to open the Help Assistant
     - Ask: "Why was my transaction flagged?"
     - Ask: "What does high risk mean?"
4. **Risk Score** `/dashboard/risk`
   - Try a high-risk profile: Income=10000, Employment=0.5, Late Payments=3
   - Click "Calculate Risk Score"
   - Review the risk gauge, factors, and recommendations
   - Toggle simplified view
5. **Reports** `/dashboard/reports`
   - View seeded historical reports
   - Click any report to see fraud and risk sections with next steps
6. **Help Assistant** `/dashboard/assistant`
   - Dedicated Q&A page with suggested questions and topic tiles

### Flow B — Analyst (analyst@demo.com)

1. **Login** → redirects to `/analyst`
2. **Overview** — shows open case count, high-risk count, average fraud score, and the top 5 high-priority cases
3. **Cases** `/analyst/cases`
   - Use tabs to filter: All / Open / Escalated / Closed
   - Click any case row to open the detail panel
   - Click "Make Decision" → choose Clear, Escalate, or Block
   - Add optional notes and confirm
   - Case status updates in real-time via SWR revalidation

---

## Key Technical Points for Presenters

- **Authentication**: JWT cookies (HTTP-only, 8h expiry), bcrypt password hashing
- **Fraud engine**: Rule-based scoring on 7 signals (geo, velocity, amount, device, merchant)
- **Risk engine**: Rule-based scoring on 5 financial features with spend-to-income ratio
- **Transparency**: Every prediction includes reason codes, human summaries, and suggested actions
- **Accessibility assistant**: Rule-based FAQ + context-aware plain-language explanations
- **Simplified view**: Toggle on any result to get a non-technical explanation
- **Auto-case creation**: High-risk fraud predictions automatically create analyst cases
- **Audit log**: Every analyst decision is recorded with actor, action, and metadata
- **Database**: Neon serverless PostgreSQL with parameterised queries

---

## Resetting Demo Data

To reset to a clean demo state:
```sql
-- Clear predictions and cases (keeps users)
TRUNCATE fraud_predictions, risk_predictions, cases, reports, audit_log RESTART IDENTITY CASCADE;
```

Then re-run:
```bash
psql $DATABASE_URL -f scripts/seed-demo.sql
```

---

## Production Checklist

- [ ] Set `JWT_SECRET` to a strong random string (min 32 chars)
- [ ] Set `NODE_ENV=production`
- [ ] Enable Neon connection pooling for high traffic
- [ ] Add rate limiting to `/api/auth/login`
- [ ] Replace rule-based engines with Python ML model API calls
- [ ] Enable HTTPS and secure cookie settings (already enforced in production mode)
- [ ] Add input validation and schema enforcement (e.g., zod)
- [ ] Set up monitoring and alerting on case queue depth
