-- Lokal Platform D1 Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    id_number TEXT,
    email TEXT,
    pin_hash TEXT,
    kyc_status TEXT DEFAULT 'PENDING',
    status TEXT DEFAULT 'ACTIVE',
    referred_by TEXT,
    referral_code TEXT UNIQUE,
    loyalty_points INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (referred_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    code TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone_number);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    balance REAL DEFAULT 0.00,
    currency TEXT DEFAULT 'ZAR',
    status TEXT DEFAULT 'ACTIVE',
    daily_limit REAL DEFAULT 5000.00,
    monthly_limit REAL DEFAULT 50000.00,
    daily_spent REAL DEFAULT 0.00,
    monthly_spent REAL DEFAULT 0.00,
    last_daily_reset TEXT DEFAULT (datetime('now')),
    last_monthly_reset TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    fee REAL DEFAULT 0.00,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'PENDING',
    payment_method TEXT,
    agent_id TEXT,
    description TEXT,
    extra_data TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (wallet_id) REFERENCES wallets(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    agent_code TEXT UNIQUE NOT NULL,
    business_name TEXT NOT NULL,
    business_type TEXT DEFAULT 'OTHER',
    tier TEXT DEFAULT 'BRONZE',
    float_balance REAL DEFAULT 0.00,
    commission_balance REAL DEFAULT 0.00,
    total_sales REAL DEFAULT 0.00,
    monthly_sales REAL DEFAULT 0.00,
    location_lat REAL,
    location_lng REAL,
    address TEXT,
    territory_id TEXT,
    status TEXT DEFAULT 'PENDING',
    low_float_threshold REAL DEFAULT 100.00,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- WiFi packages table
CREATE TABLE IF NOT EXISTS wifi_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    data_limit_mb INTEGER NOT NULL,
    validity_hours INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- WiFi vouchers table
CREATE TABLE IF NOT EXISTS wifi_vouchers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    voucher_code TEXT UNIQUE NOT NULL,
    unifi_site_id TEXT,
    status TEXT DEFAULT 'UNUSED',
    data_limit_mb INTEGER NOT NULL,
    data_used_mb INTEGER DEFAULT 0,
    validity_hours INTEGER NOT NULL,
    activated_at TEXT,
    expires_at TEXT,
    transaction_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (package_id) REFERENCES wifi_packages(id)
);

-- Electricity packages table
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Solar poles table
CREATE TABLE IF NOT EXISTS solar_poles (
    id TEXT PRIMARY KEY,
    pole_code TEXT UNIQUE NOT NULL,
    location_name TEXT,
    location_lat REAL,
    location_lng REAL,
    capacity_kw REAL,
    status TEXT DEFAULT 'ACTIVE',
    last_heartbeat TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Electricity meters table
CREATE TABLE IF NOT EXISTS electricity_meters (
    id TEXT PRIMARY KEY,
    meter_number TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    solar_pole_id TEXT,
    address TEXT,
    kwh_balance REAL DEFAULT 0.00,
    status TEXT DEFAULT 'ON',
    last_reading REAL DEFAULT 0.00,
    last_heartbeat TEXT,
    iot_device_id TEXT,
    unlimited_expires_at TEXT,
    current_consumption_kwh REAL DEFAULT 0.00,
    cutoff_enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (solar_pole_id) REFERENCES solar_poles(id)
);

-- Electricity consumption table
CREATE TABLE IF NOT EXISTS electricity_consumption (
    id TEXT PRIMARY KEY,
    meter_id TEXT NOT NULL,
    kwh_consumed REAL NOT NULL,
    reading_before REAL NOT NULL,
    reading_after REAL NOT NULL,
    recorded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (meter_id) REFERENCES electricity_meters(id)
);

-- Seed default WiFi packages
INSERT OR IGNORE INTO wifi_packages (id, name, description, price, data_limit_mb, validity_hours, is_active, sort_order)
VALUES 
    ('pkg-wifi-1', '1 Day Pass', '500MB valid for 24 hours', 15.00, 500, 24, 1, 1),
    ('pkg-wifi-2', '7 Day Pass', '2GB valid for 7 days', 50.00, 2048, 168, 1, 2),
    ('pkg-wifi-3', '14 Day Pass', '5GB valid for 14 days', 90.00, 5120, 336, 1, 3),
    ('pkg-wifi-4', '30 Day Pass', '10GB valid for 30 days', 150.00, 10240, 720, 1, 4);

-- Seed default electricity packages
INSERT OR IGNORE INTO electricity_packages (id, name, description, price, package_type, kwh_amount, validity_days, is_active, sort_order)
VALUES 
    ('pkg-elec-1', '50 kWh Units', '50 kWh prepaid electricity units', 75.00, 'UNITS', 50.00, NULL, 1, 1),
    ('pkg-elec-2', '100 kWh Units', '100 kWh prepaid electricity units', 140.00, 'UNITS', 100.00, NULL, 1, 2),
    ('pkg-elec-3', '7 Day Unlimited', 'Unlimited electricity for 7 days', 200.00, 'UNLIMITED', NULL, 7, 1, 3),
    ('pkg-elec-4', '30 Day Unlimited', 'Unlimited electricity for 30 days', 600.00, 'UNLIMITED', NULL, 30, 1, 4);
