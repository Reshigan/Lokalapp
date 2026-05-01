-- Reconcile pre-existing remote D1 schema with what the new worker expects.
-- Idempotent — safe to re-run.

-- New columns on existing tables. Run only if column doesn't already exist
-- (D1 will error if it does — wrap each manually if re-running).
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- Align agent_customers — add user_id column if it doesn't exist.
ALTER TABLE agent_customers ADD COLUMN user_id TEXT;
-- Backfill from customer_id where possible.
UPDATE agent_customers SET user_id = customer_id WHERE user_id IS NULL AND customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_customers_user ON agent_customers(user_id);
