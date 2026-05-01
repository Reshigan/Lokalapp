-- Default tariffs and a community office for the postpaid billing flow.
-- Run after 0001_initial.sql.

-- Flat tariff
INSERT OR IGNORE INTO tariff_plans (id, name, description, type, billing_period, flat_rate_per_kwh, service_fee, is_active)
VALUES ('tar-flat', 'Flat Residential', 'R2.20/kWh, monthly', 'FLAT', 'MONTHLY', 2.20, 0, 1);

-- Stepped block tariff
INSERT OR IGNORE INTO tariff_plans (id, name, description, type, billing_period, service_fee, is_active)
VALUES ('tar-stepped', 'Block Residential', '0-50 R1.50, 51-350 R2.20, 350+ R3.10', 'UNITS_BLOCK', 'MONTHLY', 15, 1);

INSERT OR IGNORE INTO tariff_blocks (id, tariff_id, from_kwh, to_kwh, rate_per_kwh, sort_order) VALUES
  ('blk-1', 'tar-stepped', 0,   50,   1.50, 1),
  ('blk-2', 'tar-stepped', 50,  350,  2.20, 2),
  ('blk-3', 'tar-stepped', 350, NULL, 3.10, 3);

-- Time-of-use tariff
INSERT OR IGNORE INTO tariff_plans (id, name, description, type, billing_period, service_fee, is_active)
VALUES ('tar-tou', 'Time of Use', 'Peak / Standard / Off-peak', 'TIME_OF_USE', 'MONTHLY', 20, 1);

INSERT OR IGNORE INTO tariff_time_bands (id, tariff_id, name, start_hour, end_hour, rate_per_kwh, sort_order) VALUES
  ('tb-1', 'tar-tou', 'PEAK',     17, 21, 3.50, 1),
  ('tb-2', 'tar-tou', 'STANDARD',  6, 17, 2.20, 2),
  ('tb-3', 'tar-tou', 'OFF_PEAK', 21,  6, 1.20, 3);

-- Default community office
INSERT OR IGNORE INTO community_offices (id, name, code, address, is_active)
VALUES ('off-main', 'Main Community Office', 'MAIN', 'Community Centre, Main Road', 1);

-- WiFi packages (kept from existing)
INSERT OR IGNORE INTO wifi_packages (id, name, description, price, data_limit_mb, validity_hours, sort_order) VALUES
  ('pkg-wifi-1', 'Daily Lite',       '500MB valid for 24 hours',  5,    500,   24,  1),
  ('pkg-wifi-2', 'Daily Standard',   '1GB valid for 24 hours',    10,  1024,   24,  2),
  ('pkg-wifi-3', 'Weekly Value',     '3GB valid for 7 days',      25,  3072,  168,  3),
  ('pkg-wifi-4', 'Weekly Plus',      '7GB valid for 7 days',      50,  7168,  168,  4),
  ('pkg-wifi-5', 'Monthly Essential','15GB valid for 30 days',    99, 15360,  720,  5),
  ('pkg-wifi-6', 'Monthly Premium',  '30GB valid for 30 days',   179, 30720,  720,  6);

-- Prepaid electricity packages (kept from existing)
INSERT OR IGNORE INTO electricity_packages (id, name, description, price, kwh_amount, package_type, sort_order) VALUES
  ('pkg-elec-1', 'Basic 10 kWh',    '10 units of electricity',   25,   10, 'UNITS', 1),
  ('pkg-elec-2', 'Standard 20 kWh', '20 units of electricity',   48,   20, 'UNITS', 2),
  ('pkg-elec-3', 'Value 50 kWh',    '50 units of electricity',  115,   50, 'UNITS', 3),
  ('pkg-elec-4', 'Family 100 kWh',  '100 units of electricity', 220,  100, 'UNITS', 4),
  ('pkg-elec-5', 'Bulk 200 kWh',    '200 units of electricity', 420,  200, 'UNITS', 5);
