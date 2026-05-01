-- Additional tables for admin settings + agent customers (legacy WiFi/electricity sales).

-- Agent → customer relationship for the prepaid sales flow.
CREATE TABLE IF NOT EXISTS agent_customers (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  notes TEXT,
  total_purchases REAL DEFAULT 0,
  last_purchase_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_customers_agent ON agent_customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_customers_user ON agent_customers(user_id);

-- Commission ledger entries
CREATE TABLE IF NOT EXISTS agent_commissions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  transaction_id TEXT REFERENCES transactions(id),
  type TEXT NOT NULL,                          -- EARNED | WITHDRAWN
  amount REAL NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_commissions_agent ON agent_commissions(agent_id);

-- Settings: payment gateways, bank accounts, IoT devices
CREATE TABLE IF NOT EXISTS payment_gateways (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  merchant_id TEXT,
  merchant_key TEXT,
  is_sandbox INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  config_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_number TEXT NOT NULL,
  branch_code TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS iot_devices (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'OFFLINE',
  last_heartbeat TEXT,
  meter_id TEXT REFERENCES electricity_meters(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
