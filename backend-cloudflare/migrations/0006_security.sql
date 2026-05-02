-- Security hardening: rate-limit table + max bill setting.

CREATE TABLE IF NOT EXISTS rate_limits_v2 (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  window_start TEXT NOT NULL,
  PRIMARY KEY (scope, key)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_v2_window ON rate_limits_v2(window_start);
