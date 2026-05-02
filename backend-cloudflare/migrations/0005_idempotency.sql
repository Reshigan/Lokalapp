-- Idempotency keys for non-transaction money flows (settlements, collections,
-- agent transactions, etc.) — paired with the existing transactions.idempotency_key
-- for wallet purchases.

CREATE TABLE IF NOT EXISTS idempotency_keys (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  response TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, key)
);
CREATE INDEX IF NOT EXISTS idx_idem_created ON idempotency_keys(created_at);
