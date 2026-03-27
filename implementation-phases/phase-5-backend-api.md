# Phase 5 - Backend API

## Objective
Implement secure APIs that connect UI, ML services, and data storage.

## Tasks
- Set up Node.js + Express service.
- Add JWT auth for demo roles (user, analyst, admin).
- Implement endpoints:
  - `POST /auth/login`
  - `POST /fraud/score`
  - `POST /risk/score`
  - `GET /reports/:id`
  - `GET /cases`
  - `POST /cases/:id/decision`
- Persist users, predictions, reports, and case decisions.

## Deliverables
- Running API server with Swagger/Postman collection
- DB schema/migrations (SQLite or Postgres for MVP)
- Integration logic for Python ML service

## Exit Criteria
- Endpoints pass happy-path integration tests.
- Auth-protected routes enforce role checks.
