-- Patch demo user password hashes to the correct bcrypt hash for 'demo-password'
UPDATE users
SET password_hash = '$2b$10$3OhRi.2bkygehpQ1W1A8T.QUaAgBHybiItcGVS79g4E5QrhCkB0ly'
WHERE id IN ('u_00001', 'u_00010', 'u_00099');
