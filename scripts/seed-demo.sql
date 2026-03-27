-- ─────────────────────────────────────────────────────────────────────────────
-- FINTECH Platform — Demo Seed Data (Phase 8)
-- Run AFTER migrate.sql
-- Populates realistic fraud predictions, risk predictions, reports, and cases
-- for a compelling end-to-end demo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fraud Predictions (12 transactions across all risk bands) ─────────────

INSERT INTO fraud_predictions (id, user_id, txn_id, fraud_score, fraud_band, confidence, primary_reason, reasons, human_summary, suggested_actions, created_at)
VALUES

-- Low risk (5 transactions)
('fp_demo_001', 'u_00001', 'TXN-20240301-001', 0.08, 'low', 0.94,
 'Normal transaction pattern',
 '[{"code":"FRD_AMT_PATTERN","message":"Typical spending amount"},{"code":"FRD_GEO_NEW_CITY","message":"Known merchant location"}]',
 'This transaction looks safe. The amount and location match your usual spending patterns. No action is needed.',
 '["No action required.","Continue monitoring future transactions."]',
 NOW() - INTERVAL '6 days'),

('fp_demo_002', 'u_00001', 'TXN-20240302-004', 0.12, 'low', 0.91,
 'Recognised merchant and location',
 '[{"code":"FRD_MERCHANT_NEW","message":"Repeat merchant"},{"code":"FRD_AMT_DEVIATION","message":"Small amount deviation"}]',
 'This transaction appears to be a routine purchase at a familiar merchant. No unusual activity detected.',
 '["No action required."]',
 NOW() - INTERVAL '5 days'),

('fp_demo_003', 'u_00001', 'TXN-20240303-007', 0.19, 'low', 0.89,
 'Minor velocity increase',
 '[{"code":"FRD_VEL_HIGH","message":"Slightly elevated transaction count"},{"code":"FRD_AMT_PATTERN","message":"Amount within normal range"}]',
 'Your transaction count is slightly higher than usual today, but the amounts are normal. This is not a concern.',
 '["No action required.","Review if velocity continues to increase."]',
 NOW() - INTERVAL '4 days'),

('fp_demo_004', 'u_00001', 'TXN-20240304-010', 0.07, 'low', 0.97,
 'Completely routine transaction',
 '[{"code":"FRD_AMT_PATTERN","message":"Expected amount range"}]',
 'Transaction looks entirely normal. Amount, location, and device all match your typical profile.',
 '["No action required."]',
 NOW() - INTERVAL '3 days'),

('fp_demo_005', 'u_00001', 'TXN-20240305-013', 0.23, 'low', 0.87,
 'New city but low amount',
 '[{"code":"FRD_GEO_NEW_CITY","message":"Transaction from new city"},{"code":"FRD_AMT_PATTERN","message":"Low amount reduces concern"}]',
 'This transaction is from a city you have not used before, but the small amount makes it low risk. Verify if you travelled recently.',
 '["Confirm you were in this city on this date.","No blocking action taken."]',
 NOW() - INTERVAL '2 days'),

-- Medium risk (4 transactions)
('fp_demo_006', 'u_00001', 'TXN-20240306-022', 0.54, 'medium', 0.81,
 'New device detected',
 '[{"code":"FRD_DEVICE_NEW","message":"New device used for this transaction"},{"code":"FRD_MERCHANT_NEW","message":"First time at this merchant"}]',
 'You used a device we have not seen before at a new merchant. This is unusual but not definitively fraudulent. An analyst will review.',
 '["Verify you authorised this transaction.","If unrecognised, contact support immediately.","Analyst review has been queued."]',
 NOW() - INTERVAL '2 days'),

('fp_demo_007', 'u_00001', 'TXN-20240306-031', 0.61, 'medium', 0.78,
 'High velocity with geo change',
 '[{"code":"FRD_VEL_HIGH","message":"High transaction velocity"},{"code":"FRD_GEO_NEW_COUNTRY","message":"Country change detected"}]',
 'You made several transactions quickly and one was from a different country than usual. This combination looks suspicious.',
 '["Confirm all recent transactions are yours.","If travelling, this may be normal.","Contact support if any transaction is unrecognised."]',
 NOW() - INTERVAL '1 day'),

('fp_demo_008', 'u_00001', 'TXN-20240307-044', 0.49, 'medium', 0.83,
 'Amount spike above average',
 '[{"code":"FRD_AMT_SPIKE","message":"Amount significantly above 30-day average"},{"code":"FRD_MERCHANT_NEW","message":"New merchant category"}]',
 'This transaction is larger than your typical purchases and is at a merchant type you rarely use. A brief review may occur.',
 '["Verify the transaction amount is correct.","Keep your receipt for this purchase."]',
 NOW() - INTERVAL '1 day'),

('fp_demo_009', 'u_00001', 'TXN-20240307-058', 0.57, 'medium', 0.79,
 'Behaviour change pattern',
 '[{"code":"FRD_BEHAVIOR_CHANGE","message":"Spending pattern change detected"},{"code":"FRD_BEHAVIOR_TIME","message":"Transaction at unusual hour"}]',
 'This transaction happened at an unusual time and does not match your typical spending behaviour. It has been flagged for review.',
 '["Confirm this transaction is yours.","If you often shop at this time, no action needed."]',
 NOW() - INTERVAL '8 hours'),

-- High risk (3 transactions)
('fp_demo_010', 'u_00001', 'TXN-20240308-071', 0.87, 'high', 0.92,
 'Impossible travel detected',
 '[{"code":"FRD_GEO_MISMATCH","message":"Impossible geographic travel"},{"code":"FRD_DEVICE_NEW","message":"New device"},{"code":"FRD_VEL_BURST","message":"Transaction burst in 2 minutes"}]',
 'Two transactions occurred from locations hundreds of kilometres apart within minutes. This is physically impossible and strongly indicates fraud.',
 '["Contact support immediately if you did not make this transaction.","Your card may be compromised.","An analyst has been alerted.","Consider requesting a new card."]',
 NOW() - INTERVAL '4 hours'),

('fp_demo_011', 'u_00001', 'TXN-20240308-082', 0.93, 'high', 0.95,
 'Flagged device with rapid burst',
 '[{"code":"FRD_DEVICE_FLAGGED","message":"Device previously associated with fraud"},{"code":"FRD_VEL_RAPID","message":"12 transactions in 8 minutes"},{"code":"FRD_MERCHANT_FLAGGED","message":"Merchant flagged in fraud database"}]',
 'This device has been seen in previous fraud cases. 12 transactions were made in 8 minutes at a flagged merchant. This is extremely suspicious.',
 '["Block this transaction immediately.","Contact support now.","Request emergency card replacement.","File a fraud dispute."]',
 NOW() - INTERVAL '2 hours'),

('fp_demo_012', 'u_00001', 'TXN-20240308-095', 0.79, 'high', 0.88,
 'New country with large amount',
 '[{"code":"FRD_GEO_NEW_COUNTRY","message":"New country never transacted in"},{"code":"FRD_AMT_SPIKE","message":"Amount 4x your 30-day average"},{"code":"FRD_GEO_JUMP","message":"Geographic jump from last transaction"}]',
 'A large transaction occurred in a country you have never transacted in before, shortly after a local transaction. This is flagged as high risk.',
 '["Verify you are currently travelling in this country.","If not, contact support immediately.","Transaction has been flagged for analyst review."]',
 NOW() - INTERVAL '30 minutes')

ON CONFLICT (id) DO NOTHING;

-- ── 2. Risk Predictions (4 profiles) ─────────────────────────────────────────

INSERT INTO risk_predictions (id, user_id, subject_id, risk_score, risk_band, confidence, primary_reason, reasons, human_summary, suggested_actions, features, created_at)
VALUES

('rp_demo_001', 'u_00001', 'S-DEMO-LOW-001', 0.18, 'low', 0.93,
 'Stable income and clean payment history',
 '[{"code":"RISK_INCOME_LOW","message":"Healthy income level"},{"code":"RISK_PAYMENT_CLEAN","message":"No missed payments in 12 months"},{"code":"RISK_PROFILE_ESTABLISHED","message":"Established 3-year credit history"}]',
 'Your financial profile looks healthy and stable. Your income is consistent, you have no missed payments, and your credit history is well established. Lenders are likely to view you favourably.',
 '["Maintain on-time payments to keep your score low.","Continue your current saving habits."]',
 '{"income_monthly":45000,"employment_years":5,"credit_history_months":36,"avg_monthly_spend":22000,"late_payments_12m":0}',
 NOW() - INTERVAL '5 days'),

('rp_demo_002', 'u_00001', 'S-DEMO-MED-001', 0.52, 'medium', 0.84,
 'Moderate late payments with high spend ratio',
 '[{"code":"RISK_PAYMENT_LATE","message":"2 late payments in last 12 months"},{"code":"RISK_SPEND_RATIO","message":"Monthly spend is 71% of income"},{"code":"RISK_EMPLOYMENT_SHORT","message":"Under 2 years employment"}]',
 'Your profile shows some areas of concern. You have had a couple of late payments this year and your monthly spending is high relative to your income. Improving these areas will lower your risk score.',
 '["Set up automatic payments to avoid late fees.","Try to reduce monthly spending by 10–15%.","Build an emergency fund of 3 months income."]',
 '{"income_monthly":28000,"employment_years":1.5,"credit_history_months":18,"avg_monthly_spend":20000,"late_payments_12m":2}',
 NOW() - INTERVAL '3 days'),

('rp_demo_003', 'u_00001', 'S-DEMO-HIGH-001', 0.81, 'high', 0.89,
 'Multiple missed payments and declining income',
 '[{"code":"RISK_PAYMENT_MISSED","message":"4 missed payments in last 12 months"},{"code":"RISK_INCOME_DECLINING","message":"Income has decreased over 6 months"},{"code":"RISK_SPEND_VOLATILE","message":"Highly irregular spending pattern"},{"code":"RISK_CREDIT_SHALLOW","message":"Limited credit history"}]',
 'Your credit risk score is high. You have missed several payments this year, your income has declined recently, and your spending is unpredictable. Lenders may require additional information or offer different loan terms.',
 '["Speak with a financial advisor about debt management.","Prioritise paying overdue accounts.","Avoid taking on new credit until your score improves.","Contact your bank about a payment plan if you are struggling."]',
 '{"income_monthly":14000,"employment_years":0.8,"credit_history_months":8,"avg_monthly_spend":16000,"late_payments_12m":4}',
 NOW() - INTERVAL '1 day'),

('rp_demo_004', 'u_00001', 'S-DEMO-LOW-002', 0.24, 'low', 0.91,
 'Long history with zero late payments',
 '[{"code":"RISK_PROFILE_ESTABLISHED","message":"5-year established credit history"},{"code":"RISK_PAYMENT_CLEAN","message":"Zero missed or late payments"},{"code":"RISK_CREDIT_CLEAN","message":"Clean credit record"}]',
 'Excellent financial profile. You have a long, clean credit history with no late payments and stable employment. You are a low-risk borrower.',
 '["Keep up your current payment habits.","You may qualify for preferential interest rates."]',
 '{"income_monthly":62000,"employment_years":7,"credit_history_months":60,"avg_monthly_spend":31000,"late_payments_12m":0}',
 NOW() - INTERVAL '12 hours')

ON CONFLICT (id) DO NOTHING;

-- ── 3. Cases (auto-created for high-risk fraud predictions) ──────────────────

INSERT INTO cases (id, txn_id, prediction_id, user_id, fraud_score, fraud_band, status, decision, notes, updated_by, created_at, updated_at)
VALUES

-- Open cases (unreviewed)
('case_demo_001', 'TXN-20240308-071', 'fp_demo_010', 'u_00001', 0.87, 'high', 'open', NULL, NULL, NULL,
 NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

('case_demo_002', 'TXN-20240308-082', 'fp_demo_011', 'u_00001', 0.93, 'high', 'open', NULL, NULL, NULL,
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

('case_demo_003', 'TXN-20240308-095', 'fp_demo_012', 'u_00001', 0.79, 'high', 'open', NULL, NULL, NULL,
 NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),

-- Closed / reviewed cases (for analyst demo)
('case_demo_004', 'TXN-20240306-022', 'fp_demo_006', 'u_00001', 0.54, 'medium', 'closed', 'clear',
 'Customer confirmed transaction. New device registered by the account holder for business travel.',
 'u_00010',
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

('case_demo_005', 'TXN-20240306-031', 'fp_demo_007', 'u_00001', 0.61, 'medium', 'escalated', 'escalate',
 'Customer unreachable. Transaction pattern consistent with account takeover. Escalated to compliance team.',
 'u_00010',
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '18 hours'),

('case_demo_006', 'TXN-20240307-044', 'fp_demo_008', 'u_00001', 0.49, 'medium', 'closed', 'clear',
 'Customer confirmed large purchase. New merchant is a verified electronics retailer.',
 'u_00010',
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours')

ON CONFLICT (id) DO NOTHING;

-- ── 4. Sample Reports ─────────────────────────────────────────────────────────

INSERT INTO reports (id, user_id, summary, fraud_section, risk_section, next_steps, created_at)
VALUES

('rpt_demo_001', 'u_00001',
 'Account review for period 01 Mar 2024 – 08 Mar 2024. 12 transactions scored. 3 flagged as high risk. 1 credit risk profile assessed as high risk. Immediate action recommended.',
 '{"scored_count":12,"flagged_count":3,"flagged_rate":0.25,"high_risk_txns":["TXN-20240308-071","TXN-20240308-082","TXN-20240308-095"],"band_distribution":{"low":5,"medium":4,"high":3}}',
 '{"subject_id":"S-DEMO-HIGH-001","risk_score":0.81,"risk_band":"high","primary_reason":"Multiple missed payments and declining income"}',
 '["Review and dispute any unrecognised high-risk transactions immediately.","Contact support to request card replacement.","Speak with a financial advisor about improving your credit risk score.","Set up payment alerts on your account."]',
 NOW() - INTERVAL '2 hours'),

('rpt_demo_002', 'u_00001',
 'Routine monthly review. 4 transactions scored. All low risk. Credit risk profile assessed as low. No action required.',
 '{"scored_count":4,"flagged_count":0,"flagged_rate":0.0,"high_risk_txns":[],"band_distribution":{"low":4,"medium":0,"high":0}}',
 '{"subject_id":"S-DEMO-LOW-001","risk_score":0.18,"risk_band":"low","primary_reason":"Stable income and clean payment history"}',
 '["Continue your current financial habits.","No immediate action required.","Schedule next review in 30 days."]',
 NOW() - INTERVAL '5 days')

ON CONFLICT (id) DO NOTHING;

-- ── 5. Audit Log entries ──────────────────────────────────────────────────────

INSERT INTO audit_log (actor_id, action, entity_type, entity_id, meta, created_at)
VALUES
  ('u_00010', 'CASE_DECISION', 'case', 'case_demo_004', '{"decision":"clear","notes":"Customer confirmed transaction"}', NOW() - INTERVAL '1 day'),
  ('u_00010', 'CASE_DECISION', 'case', 'case_demo_005', '{"decision":"escalate","notes":"Account takeover pattern"}', NOW() - INTERVAL '18 hours'),
  ('u_00010', 'CASE_DECISION', 'case', 'case_demo_006', '{"decision":"clear","notes":"Verified large purchase"}', NOW() - INTERVAL '20 hours'),
  ('u_00001', 'FRAUD_SCORE',   'fraud_prediction', 'fp_demo_010', '{"txn_id":"TXN-20240308-071","fraud_band":"high"}', NOW() - INTERVAL '4 hours'),
  ('u_00001', 'RISK_SCORE',    'risk_prediction',  'rp_demo_003', '{"subject_id":"S-DEMO-HIGH-001","risk_band":"high"}', NOW() - INTERVAL '1 day'),
  ('u_00001', 'REPORT_GEN',    'report',           'rpt_demo_001', '{"scored_count":12,"flagged_count":3}', NOW() - INTERVAL '2 hours');
