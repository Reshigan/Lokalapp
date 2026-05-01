import { json, readBody, error } from '../lib/http.js';
import { all, one, run, nowIso } from '../lib/db.js';
import { uuid, voucherCode, transactionRef } from '../lib/ids.js';

// ---------- WiFi packages + vouchers ----------

export async function listWifiPackages(_request, env) {
  const rows = await all(env, 'SELECT * FROM wifi_packages WHERE is_active = 1 ORDER BY sort_order, price');
  return json({ packages: rows.map((r) => ({ ...r, price: Number(r.price) })) });
}

export async function purchaseWifi(request, env, currentUser) {
  const body = await readBody(request);
  const pkg = await one(env, 'SELECT * FROM wifi_packages WHERE id = ? AND is_active = 1', body.package_id);
  if (!pkg) return error('Package not found');

  let wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', currentUser.id);
  if (!wallet) return error('Wallet missing');
  if (Number(wallet.balance) < Number(pkg.price)) return error('Insufficient balance');

  const before = Number(wallet.balance);
  const after = before - Number(pkg.price);

  const txId = uuid();
  const voucherId = uuid();
  const code = voucherCode();
  await run(
    env,
    `UPDATE wallets SET balance = ?, daily_spent = daily_spent + ?, monthly_spent = monthly_spent + ?, updated_at = ? WHERE id = ?`,
    after, pkg.price, pkg.price, nowIso(), wallet.id,
  );
  await run(
    env,
    `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after, reference, status, payment_method, description, created_at)
     VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, 'COMPLETED', 'WALLET', ?, ?)`,
    txId, wallet.id, -Number(pkg.price), before, after, transactionRef(),
    `WiFi: ${pkg.name}`, nowIso(),
  );
  await run(
    env,
    `INSERT INTO wifi_vouchers (id, user_id, package_id, voucher_code, status, data_limit_mb, validity_hours, created_at)
     VALUES (?, ?, ?, ?, 'UNUSED', ?, ?, ?)`,
    voucherId, currentUser.id, pkg.id, code, pkg.data_limit_mb, pkg.validity_hours, nowIso(),
  );
  return json({
    transaction_id: txId,
    voucher_id: voucherId,
    voucher_code: code,
    new_balance: after,
  }, 201);
}

export async function listVouchers(_request, env, currentUser) {
  const rows = await all(env, `SELECT v.*, p.name AS package_name FROM wifi_vouchers v LEFT JOIN wifi_packages p ON p.id = v.package_id WHERE v.user_id = ? ORDER BY v.created_at DESC`, currentUser.id);
  return json({
    vouchers: rows.map((v) => ({
      ...v,
      data_remaining_mb: Math.max(0, Number(v.data_limit_mb || 0) - Number(v.data_used_mb || 0)),
    })),
  });
}

export async function activateVoucher(_request, env, currentUser, _deps, params) {
  const v = await one(env, 'SELECT * FROM wifi_vouchers WHERE id = ? AND user_id = ?', params.id, currentUser.id);
  if (!v) return error('Voucher not found', 404);
  if (v.status !== 'UNUSED') return error(`Voucher is ${v.status}`);
  const expiresAt = new Date(Date.now() + Number(v.validity_hours || 24) * 3600_000).toISOString();
  await run(
    env,
    'UPDATE wifi_vouchers SET status = ?, activated_at = ?, expires_at = ? WHERE id = ?',
    'ACTIVE', nowIso(), expiresAt, v.id,
  );
  return json({ id: v.id, status: 'ACTIVE', expires_at: expiresAt });
}

// ---------- Prepaid electricity packages + meters (legacy flow) ----------

export async function listElectricityPackages(_request, env) {
  const rows = await all(env, 'SELECT * FROM electricity_packages WHERE is_active = 1 ORDER BY sort_order, price');
  return json({
    packages: rows.map((r) => ({ ...r, price: Number(r.price), kwh_amount: Number(r.kwh_amount || 0) })),
  });
}

export async function purchaseElectricity(request, env, currentUser) {
  const body = await readBody(request);
  const pkg = await one(env, 'SELECT * FROM electricity_packages WHERE id = ? AND is_active = 1', body.package_id);
  if (!pkg) return error('Package not found');

  const meter = await one(env, 'SELECT * FROM electricity_meters WHERE id = ? AND user_id = ?', body.meter_id, currentUser.id);
  if (!meter) return error('Meter not found or not registered to you', 404);

  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', currentUser.id);
  if (!wallet || Number(wallet.balance) < Number(pkg.price)) return error('Insufficient balance');

  const before = Number(wallet.balance);
  const after = before - Number(pkg.price);
  const ref = transactionRef();
  const txId = uuid();
  await run(env, 'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', after, nowIso(), wallet.id);
  await run(
    env,
    `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after, reference, status, payment_method, description, created_at)
     VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, 'COMPLETED', 'WALLET', ?, ?)`,
    txId, wallet.id, -Number(pkg.price), before, after, ref,
    `Electricity: ${pkg.name} for ${meter.meter_number}`, nowIso(),
  );
  const newKwh = Number(meter.kwh_balance || 0) + Number(pkg.kwh_amount || 0);
  await run(env, 'UPDATE electricity_meters SET kwh_balance = ?, updated_at = ? WHERE id = ?',
    newKwh, nowIso(), meter.id);

  return json({
    transaction_id: txId,
    reference: ref,
    new_wallet_balance: after,
    new_kwh_balance: newKwh,
    kwh_purchased: Number(pkg.kwh_amount || 0),
  });
}

export async function listMyMeters(_request, env, currentUser) {
  const rows = await all(env, 'SELECT * FROM electricity_meters WHERE user_id = ? ORDER BY created_at DESC', currentUser.id);
  return json({
    meters: rows.map((r) => ({ ...r, kwh_balance: Number(r.kwh_balance), last_reading: Number(r.last_reading) })),
  });
}

export async function registerMeter(request, env, currentUser) {
  const url = new URL(request.url);
  const body = await readBody(request);
  // Accept either ?meter_number=... or {meter_number: ...} body
  const meterNumber = body.meter_number || url.searchParams.get('meter_number');
  const address = body.address || url.searchParams.get('address') || null;
  if (!meterNumber) return error('meter_number required');
  const existing = await one(env, 'SELECT * FROM electricity_meters WHERE meter_number = ?', meterNumber);
  if (existing) {
    if (existing.user_id === currentUser.id) return error('Already registered to you');
    if (existing.user_id) return error('Meter belongs to someone else');
    await run(env, 'UPDATE electricity_meters SET user_id = ?, address = COALESCE(?, address) WHERE id = ?',
      currentUser.id, address, existing.id);
    return json({ meter_id: existing.id, message: 'Meter linked' });
  }
  const id = uuid();
  await run(
    env,
    `INSERT INTO electricity_meters (id, meter_number, user_id, address, status, kwh_balance, last_reading, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ON', 0, 0, ?, ?)`,
    id, meterNumber, currentUser.id, address, nowIso(), nowIso(),
  );
  return json({ meter_id: id, message: 'Meter registered' }, 201);
}
