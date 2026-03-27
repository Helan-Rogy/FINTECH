# Phase 4 - Transparency Engine

## Objective
Provide understandable reasons for fraud/risk decisions.

## Tasks
- Define standard reason codes for fraud and risk outputs.
- Generate top explanations per prediction (feature contributions or rule hits).
- Build report payload structure:
  - summary
  - confidence/band
  - top reasons
  - suggested next steps text

## Deliverables
- Explanation module in ML service
- `docs/reason-codes.md`
- JSON report schema and sample reports

## Exit Criteria
- Every prediction returns non-empty explanations.
- Reports are readable by non-technical users.
