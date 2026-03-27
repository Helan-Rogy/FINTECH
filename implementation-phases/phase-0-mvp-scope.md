# Phase 0 - MVP Scope and Contracts

## Objective
Lock the exact MVP boundaries so engineering can start without ambiguity.

## In-Scope Flows
- User submits sample financial data and receives fraud/risk outcomes.
- Analyst reviews flagged transactions and records case decisions.
- User sees explanation report with simple recommendations text.

## Tasks
- Freeze core entities: `User`, `Transaction`, `RiskProfile`, `FraudCase`, `Report`.
- Define API contracts for:
  - `POST /auth/login`
  - `POST /fraud/score`
  - `POST /risk/score`
  - `GET /reports/:id`
  - `GET /cases`, `POST /cases/:id/decision`
- Define success metrics and demo acceptance criteria.

## Deliverables
- `docs/mvp-scope.md`
- `docs/api-contracts.md`
- Endpoint request/response examples (JSON)

## Exit Criteria
- Team agrees on MVP scope and "not in scope" list.
- API contracts are versioned and ready for implementation.
