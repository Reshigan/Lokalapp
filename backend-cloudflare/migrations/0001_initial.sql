-- Lokal Platform — initial schema for Cloudflare D1
-- Apply with:  wrangler d1 execute lokal-db --file=./migrations/0001_initial.sql --remote
-- Locally:     wrangler d1 execute lokal-db --file=./migrations/0001_initial.sql --local

-- ============ Auth + Users ============

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  id_number TEXT,
  email TEXT,
  pin_hash TEXT,
  password_hash TEXT,
  kyc_status TEXT DEFAULT 'PENDING',          -- PENDING | VERIFIED | REJECTED
  status TEXT DEFAULT 'ACTIVE',                -- ACTIVE | SUSPENDED | DEACTIVATED
  is_admin INTEGER DEFAULT 0,
  referred_by TEXT REFERENCES users(id),
  referral_code TEXT UNIQUE,
  loyalty_points INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone_number);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============ Wallets + Transactions ============

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  balance REAL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'ACTIVE',
  daily_limit REAL DEFAULT 5000,
  monthly_limit REAL DEFAULT 50000,
  daily_spent REAL DEFAULT 0,
  monthly_spent REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  agent_id TEXT REFERENCES agents(id),
  type TEXT NOT NULL,                          -- TOPUP | PURCHASE | TRANSFER | REFUND | COMMISSION | WITHDRAWAL
  amount REAL NOT NULL,
  fee REAL DEFAULT 0,
  balance_before REAL,
  balance_after REAL,
  reference TEXT,
  status TEXT DEFAULT 'COMPLETED',
  payment_method TEXT,
  description TEXT,
  idempotency_key TEXT UNIQUE,
  extra_data TEXT,                             -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tx_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);

-- ============ Agents ============

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  agent_code TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT DEFAULT 'OTHER',          -- SPAZA | TRADER | COMMUNITY | OTHER
  tier TEXT DEFAULT 'BRONZE',                  -- BRONZE | SILVER | GOLD | PLATINUM
  float_balance REAL DEFAULT 0,
  commission_balance REAL DEFAULT 0,
  total_sales REAL DEFAULT 0,
  monthly_sales REAL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',               -- PENDING | ACTIVE | SUSPENDED
  low_float_threshold REAL DEFAULT 100,
  address TEXT,
  location_lat REAL,
  location_lng REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============ Prepaid product packages (existing flow) ============

CREATE TABLE IF NOT EXISTS wifi_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  data_limit_mb INTEGER,
  validity_hours INTEGER,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wifi_vouchers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  package_id TEXT REFERENCES wifi_packages(id),
  voucher_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'UNUSED',                -- UNUSED | ACTIVE | EXPIRED | DEPLETED
  data_limit_mb INTEGER,
  data_used_mb INTEGER DEFAULT 0,
  validity_hours INTEGER,
  activated_at TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electricity_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  package_type TEXT DEFAULT 'UNITS',
  kwh_amount REAL,
  validity_days INTEGER,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electricity_meters (
  id TEXT PRIMARY KEY,
  meter_number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  address TEXT,
  kwh_balance REAL DEFAULT 0,
  status TEXT DEFAULT 'ON',
  last_reading REAL DEFAULT 0,
  last_heartbeat TEXT,
  iot_device_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============ Postpaid billing: Tariffs ============

CREATE TABLE IF NOT EXISTS tariff_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,                          -- FLAT | UNITS_BLOCK | TIME_OF_USE
  billing_period TEXT NOT NULL DEFAULT 'MONTHLY', -- WEEKLY | MONTHLY
  flat_rate_per_kwh REAL,
  service_fee REAL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tariff_blocks (
  id TEXT PRIMARY KEY,
  tariff_id TEXT NOT NULL REFERENCES tariff_plans(id) ON DELETE CASCADE,
  from_kwh REAL NOT NULL,
  to_kwh REAL,
  rate_per_kwh REAL NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blocks_tariff ON tariff_blocks(tariff_id);

CREATE TABLE IF NOT EXISTS tariff_time_bands (
  id TEXT PRIMARY KEY,
  tariff_id TEXT NOT NULL REFERENCES tariff_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_hour INTEGER NOT NULL,
  end_hour INTEGER NOT NULL,
  rate_per_kwh REAL NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bands_tariff ON tariff_time_bands(tariff_id);

-- ============ Postpaid billing: Households ============

CREATE TABLE IF NOT EXISTS community_offices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  contact_phone TEXT,
  manager_user_id TEXT REFERENCES users(id),
  location_lat REAL,
  location_lng REAL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  account_number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  meter_id TEXT REFERENCES electricity_meters(id),
  tariff_id TEXT NOT NULL REFERENCES tariff_plans(id),
  community_office_id TEXT REFERENCES community_offices(id),
  registered_by_agent_id TEXT REFERENCES agents(id),

  primary_contact_name TEXT NOT NULL,
  primary_contact_phone TEXT NOT NULL,
  primary_contact_id_number TEXT,
  email TEXT,

  erf_number TEXT,
  street_address TEXT,
  suburb TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  location_lat REAL,
  location_lng REAL,

  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  last_reading_kwh REAL DEFAULT 0,
  last_reading_at TEXT,

  status TEXT DEFAULT 'ACTIVE',                -- ACTIVE | SUSPENDED | CLOSED
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_households_account ON households(account_number);
CREATE INDEX IF NOT EXISTS idx_households_user ON households(user_id);

-- ============ Postpaid billing: Readings + Invoices ============

CREATE TABLE IF NOT EXISTS meter_readings (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  meter_id TEXT REFERENCES electricity_meters(id),
  agent_id TEXT REFERENCES agents(id),
  previous_reading_kwh REAL NOT NULL,
  current_reading_kwh REAL NOT NULL,
  kwh_consumed REAL NOT NULL,
  source TEXT DEFAULT 'AGENT',                 -- AGENT | HOUSEHOLD | IOT | ESTIMATE
  peak_kwh REAL,
  standard_kwh REAL,
  off_peak_kwh REAL,
  photo_url TEXT,
  notes TEXT,
  captured_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_readings_household ON meter_readings(household_id);

CREATE TABLE IF NOT EXISTS electricity_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  household_id TEXT NOT NULL REFERENCES households(id),
  tariff_id TEXT NOT NULL REFERENCES tariff_plans(id),
  reading_id TEXT REFERENCES meter_readings(id),
  issued_by_agent_id TEXT REFERENCES agents(id),

  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  issue_date TEXT DEFAULT CURRENT_TIMESTAMP,
  due_date TEXT NOT NULL,

  previous_reading_kwh REAL NOT NULL,
  current_reading_kwh REAL NOT NULL,
  kwh_consumed REAL NOT NULL,

  energy_charge REAL NOT NULL,
  service_fee REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  amount_paid REAL DEFAULT 0,

  breakdown TEXT,                              -- JSON line items
  status TEXT DEFAULT 'ISSUED',                -- DRAFT | ISSUED | PAID | CANCELLED | OVERDUE
  notes TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoices_household ON electricity_invoices(household_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON electricity_invoices(status);

-- ============ Postpaid billing: Cash collections + Settlements ============

CREATE TABLE IF NOT EXISTS cash_collections (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  invoice_id TEXT NOT NULL REFERENCES electricity_invoices(id),
  household_id TEXT NOT NULL REFERENCES households(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),

  amount REAL NOT NULL,
  status TEXT DEFAULT 'PENDING_HOUSEHOLD_CONFIRM',  -- PENDING_HOUSEHOLD_CONFIRM | CONFIRMED | DISPUTED | VOID

  agent_confirmed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  household_confirmed_at TEXT,
  household_confirm_code TEXT,
  household_signature TEXT,

  settlement_id TEXT REFERENCES agent_settlements(id),
  settled INTEGER DEFAULT 0,

  location_lat REAL,
  location_lng REAL,
  notes TEXT,
  collected_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_collections_agent ON cash_collections(agent_id);
CREATE INDEX IF NOT EXISTS idx_collections_invoice ON cash_collections(invoice_id);

CREATE TABLE IF NOT EXISTS agent_settlements (
  id TEXT PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  community_office_id TEXT NOT NULL REFERENCES community_offices(id),

  declared_amount REAL NOT NULL,
  expected_amount REAL NOT NULL,
  confirmed_amount REAL,
  num_collections INTEGER DEFAULT 0,

  status TEXT DEFAULT 'SUBMITTED',             -- SUBMITTED | CONFIRMED | DISPUTED | CANCELLED

  agent_confirmed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  office_confirmed_at TEXT,
  office_confirmed_by_user_id TEXT REFERENCES users(id),

  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_settlements_agent ON agent_settlements(agent_id);

-- ============ RBAC ============

-- Roles: USER (implicit, granted to everyone), AGENT, OFFICE_MANAGER, SUPPORT, ADMIN.
-- A user can hold multiple roles. AGENT is also derivable from the agents table;
-- having both keeps role checks simple and consistent.
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,                          -- AGENT | OFFICE_MANAGER | SUPPORT | ADMIN
  granted_by_user_id TEXT REFERENCES users(id),
  granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique ON user_roles(user_id, role) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ============ Support tickets ============

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  opened_by_user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,                      -- BILLING | METER | PAYMENT | ACCOUNT | TECHNICAL | OTHER
  priority TEXT DEFAULT 'NORMAL',              -- LOW | NORMAL | HIGH | URGENT
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',                  -- OPEN | IN_PROGRESS | WAITING | RESOLVED | CLOSED
  related_entity_type TEXT,                    -- INVOICE | HOUSEHOLD | METER | SETTLEMENT | NONE
  related_entity_id TEXT,
  assigned_to_user_id TEXT REFERENCES users(id),
  resolved_at TEXT,
  closed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(opened_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON support_tickets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id),
  author_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachment_url TEXT,
  is_internal INTEGER DEFAULT 0,               -- internal note vs visible to opener
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON support_messages(ticket_id);

-- ============ Audit log (used by admin for IT visibility) ============

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,                        -- e.g. 'household.create', 'invoice.issue'
  entity_type TEXT,
  entity_id TEXT,
  detail TEXT,                                 -- JSON
  ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============ Notifications + Push ============

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT DEFAULT 'GENERIC',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,                                   -- JSON
  is_read INTEGER DEFAULT 0,
  push_delivered INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notification_logs(created_at);
