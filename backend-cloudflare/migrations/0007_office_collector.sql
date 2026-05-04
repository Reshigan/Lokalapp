-- Allow non-agent collectors (OFFICE_MANAGER taking cash directly).
-- Adds collected_by_user_id to cash_collections so we can credit the
-- right wallet on confirm even when there's no agent record.

ALTER TABLE cash_collections ADD COLUMN collected_by_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_collections_collector ON cash_collections(collected_by_user_id);

-- Backfill: set collected_by_user_id to the agent's user_id where present
UPDATE cash_collections
SET collected_by_user_id = (
  SELECT user_id FROM agents WHERE agents.id = cash_collections.agent_id
)
WHERE collected_by_user_id IS NULL AND agent_id IS NOT NULL;
