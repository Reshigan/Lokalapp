import { json, readBody, error, noContent } from '../lib/http.js';
import { all, one, run, nowIso } from '../lib/db.js';
import { uuid } from '../lib/ids.js';

export async function dashboardStats(_request, env) {
  const u = await one(env, 'SELECT COUNT(*) AS c FROM users');
  const uNew = await one(env, "SELECT COUNT(*) AS c FROM users WHERE created_at >= datetime('now', '-30 days')");
  const uVer = await one(env, "SELECT COUNT(*) AS c FROM users WHERE kyc_status = 'VERIFIED'");
  const a = await one(env, "SELECT COUNT(*) AS c FROM agents WHERE status = 'ACTIVE'");
  const w = await one(env, 'SELECT COALESCE(SUM(balance),0) AS bal FROM wallets');
  const invTot = await one(env, "SELECT COALESCE(SUM(total_amount),0) AS v FROM electricity_invoices");
  const invMonth = await one(env, "SELECT COALESCE(SUM(total_amount),0) AS v FROM electricity_invoices WHERE issue_date >= datetime('now', '-30 days')");
  const cash = await one(env, "SELECT COALESCE(SUM(amount),0) AS unsettled FROM cash_collections WHERE settled = 0 AND status = 'CONFIRMED'");
  const tickets = await one(env, "SELECT COUNT(*) AS open FROM support_tickets WHERE status NOT IN ('RESOLVED','CLOSED')");
  return json({
    users: { total: Number(u.c), new_30_days: Number(uNew.c), verified: Number(uVer.c) },
    agents: { active: Number(a.c) },
    revenue: { total: Number(invTot.v), last_30_days: Number(invMonth.v) },
    wallets: { total_balance: Number(w.bal) },
    unsettled_cash: Number(cash.unsettled),
    open_support_tickets: Number(tickets.open),
  });
}

export async function listUsers(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  let sql = 'SELECT id, phone_number, first_name, last_name, email, kyc_status, status, is_admin, created_at FROM users WHERE 1=1';
  const binds = [];
  if (q) {
    sql += ' AND (phone_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
    const like = `%${q}%`;
    binds.push(like, like, like, like);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const rows = await all(env, sql, ...binds);
  return json(rows);
}

export async function auditLogs(_request, env) {
  // user_id is the column name used in remote D1; works for the new schema too.
  const rows = await all(
    env,
    `SELECT al.*, u.phone_number, u.first_name, u.last_name
     FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC LIMIT 200`,
  );
  return json(rows);
}

// ---------- User detail + actions ----------

export async function getUser(_request, env, _user, _deps, params) {
  const u = await one(env, 'SELECT * FROM users WHERE id = ?', params.id);
  if (!u) return error('User not found', 404);
  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', u.id);
  const agent = await one(env, 'SELECT * FROM agents WHERE user_id = ?', u.id);
  return json({ user: u, wallet, agent });
}

export async function updateUserStatus(request, env, _user, _deps, params) {
  const url = new URL(request.url);
  const status = url.searchParams.get('new_status') || (await readBody(request)).status;
  if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
    return error('Invalid status');
  }
  const r = await run(env, 'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
    status, nowIso(), params.id);
  if (!r.success) return error('User not found', 404);
  return json({ message: 'Status updated', status });
}

export async function updateUserKyc(request, env, _user, _deps, params) {
  const url = new URL(request.url);
  const status = url.searchParams.get('new_status') || (await readBody(request)).kyc_status;
  if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
    return error('Invalid kyc_status');
  }
  const r = await run(env, 'UPDATE users SET kyc_status = ?, updated_at = ? WHERE id = ?',
    status, nowIso(), params.id);
  if (!r.success) return error('User not found', 404);
  return json({ message: 'KYC updated', kyc_status: status });
}

export async function adjustUserWallet(request, env, _user, _deps, params) {
  const body = await readBody(request);
  const amt = Number(body.amount);
  if (!Number.isFinite(amt)) return error('amount required');
  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', params.id);
  if (!wallet) return error('Wallet not found', 404);
  const before = Number(wallet.balance);
  const after = before + amt;
  await run(env, 'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?',
    after, nowIso(), wallet.id);
  await run(env,
    `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after,
       reference, status, payment_method, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 'ADJUST', ?, ?)`,
    uuid(), wallet.id, amt >= 0 ? 'TOPUP' : 'PURCHASE', amt, before, after,
    'ADJ' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    body.note || 'Admin adjustment', nowIso(),
  );
  return json({ new_balance: after });
}

// ---------- Agents ----------

export async function listAgents(request, env) {
  const url = new URL(request.url);
  const tier = url.searchParams.get('tier');
  const status = url.searchParams.get('status');
  let sql = `SELECT a.*, u.phone_number, u.first_name, u.last_name FROM agents a JOIN users u ON u.id = a.user_id WHERE 1=1`;
  const binds = [];
  if (tier) { sql += ' AND a.tier = ?'; binds.push(tier); }
  if (status) { sql += ' AND a.status = ?'; binds.push(status); }
  sql += ' ORDER BY a.created_at DESC LIMIT 200';
  const rows = await all(env, sql, ...binds);
  return json(rows);
}

export async function updateAgentTier(request, env, _user, _deps, params) {
  const url = new URL(request.url);
  const tier = url.searchParams.get('new_tier') || (await readBody(request)).tier;
  if (!['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].includes(tier)) return error('Invalid tier');
  await run(env, 'UPDATE agents SET tier = ?, updated_at = ? WHERE id = ?', tier, nowIso(), params.id);
  return json({ tier });
}

export async function updateAgentStatus(request, env, _user, _deps, params) {
  const url = new URL(request.url);
  const status = url.searchParams.get('new_status') || (await readBody(request)).status;
  if (!['PENDING', 'ACTIVE', 'SUSPENDED'].includes(status)) return error('Invalid status');
  await run(env, 'UPDATE agents SET status = ?, updated_at = ? WHERE id = ?', status, nowIso(), params.id);
  return json({ status });
}

export async function adjustAgentFloat(request, env, _user, _deps, params) {
  const body = await readBody(request);
  const amt = Number(body.amount);
  if (!Number.isFinite(amt)) return error('amount required');
  await run(env, 'UPDATE agents SET float_balance = float_balance + ?, updated_at = ? WHERE id = ?',
    amt, nowIso(), params.id);
  const a = await one(env, 'SELECT float_balance FROM agents WHERE id = ?', params.id);
  return json({ new_float_balance: Number(a.float_balance) });
}

// ---------- Products (admin CRUD) ----------

export async function listAdminWifi(_request, env) {
  return json(await all(env, 'SELECT * FROM wifi_packages ORDER BY sort_order, price'));
}

export async function createAdminWifi(request, env) {
  const b = await readBody(request);
  const id = uuid();
  await run(env,
    `INSERT INTO wifi_packages (id, name, description, price, data_limit_mb, validity_hours, is_active, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, b.name, b.description || null, Number(b.price),
    Number(b.data_limit_mb || 0), Number(b.validity_hours || 0),
    b.is_active ? 1 : 1, Number(b.sort_order || 0), nowIso(),
  );
  return json(await one(env, 'SELECT * FROM wifi_packages WHERE id = ?', id), 201);
}

export async function updateAdminWifi(request, env, _user, _deps, params) {
  const b = await readBody(request);
  const fields = ['name', 'description', 'price', 'data_limit_mb', 'validity_hours', 'is_active', 'sort_order'];
  const sets = []; const binds = [];
  for (const f of fields) {
    if (f in b) { sets.push(`${f} = ?`); binds.push(b[f]); }
  }
  if (!sets.length) return error('No fields');
  binds.push(params.id);
  await run(env, `UPDATE wifi_packages SET ${sets.join(', ')} WHERE id = ?`, ...binds);
  return json(await one(env, 'SELECT * FROM wifi_packages WHERE id = ?', params.id));
}

export async function listAdminElectricity(_request, env) {
  return json(await all(env, 'SELECT * FROM electricity_packages ORDER BY sort_order, price'));
}

export async function createAdminElectricity(request, env) {
  const b = await readBody(request);
  const id = uuid();
  await run(env,
    `INSERT INTO electricity_packages (id, name, description, price, package_type, kwh_amount, validity_days, is_active, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, b.name, b.description || null, Number(b.price),
    b.package_type || 'UNITS', Number(b.kwh_amount || 0), Number(b.validity_days || 0),
    1, Number(b.sort_order || 0), nowIso(),
  );
  return json(await one(env, 'SELECT * FROM electricity_packages WHERE id = ?', id), 201);
}

// ---------- Reports / Analytics ----------

export async function revenueReport(_request, env) {
  const total = await one(env, "SELECT COALESCE(SUM(total_amount), 0) AS billed, COALESCE(SUM(amount_paid), 0) AS paid FROM electricity_invoices");
  const wifi = await one(env, "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'PURCHASE' AND description LIKE 'WiFi%'");
  const elec = await one(env, "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'PURCHASE' AND description LIKE 'Electricity%'");
  const monthly = await all(
    env,
    `SELECT strftime('%Y-%m', issue_date) AS month,
       COALESCE(SUM(total_amount), 0) AS billed,
       COALESCE(SUM(amount_paid), 0) AS paid
     FROM electricity_invoices
     WHERE issue_date >= date('now', '-12 months')
     GROUP BY month ORDER BY month`,
  );
  return json({
    invoices: { total_billed: Number(total.billed), total_paid: Number(total.paid) },
    wifi_revenue: Math.abs(Number(wifi.total)),
    electricity_revenue: Math.abs(Number(elec.total)),
    monthly_breakdown: monthly,
  });
}

export async function agentReport(_request, env) {
  const top = await all(
    env,
    `SELECT a.id, a.agent_code, a.business_name, a.tier, a.total_sales, a.monthly_sales, a.commission_balance,
       u.phone_number
     FROM agents a JOIN users u ON u.id = a.user_id
     ORDER BY a.total_sales DESC LIMIT 50`,
  );
  return json({ top_agents: top });
}

export async function adminAnalytics(_request, env) {
  const u = await one(env, 'SELECT COUNT(*) AS c FROM users');
  const a = await one(env, 'SELECT COUNT(*) AS c FROM agents WHERE status = "ACTIVE"');
  const i = await one(env, 'SELECT COUNT(*) AS c, COALESCE(SUM(total_amount),0) AS v FROM electricity_invoices');
  const cs = await one(env, "SELECT COALESCE(SUM(amount),0) AS v FROM cash_collections WHERE status = 'CONFIRMED' AND settled = 1");
  return json({
    users: Number(u.c),
    active_agents: Number(a.c),
    invoices: { count: Number(i.c), total: Number(i.v) },
    settled_cash: Number(cs.v),
  });
}

// ---------- User analytics (consumer) ----------

export async function userAnalytics(_request, env, currentUser) {
  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', currentUser.id);
  if (!wallet) return json({ total_spent: 0, total_topups: 0, wifi_spent: 0, electricity_spent: 0, current_balance: 0, loyalty_points: 0, transaction_count: 0, monthly_breakdown: [] });
  const all_t = await all(env, 'SELECT * FROM transactions WHERE wallet_id = ?', wallet.id);
  let topups = 0; let spent = 0; let wifi = 0; let elec = 0;
  for (const t of all_t) {
    const amt = Number(t.amount);
    if (t.type === 'TOPUP') topups += amt;
    if (amt < 0) spent += -amt;
    if ((t.description || '').startsWith('WiFi')) wifi += -amt;
    if ((t.description || '').startsWith('Electricity')) elec += -amt;
  }
  return json({
    total_spent: spent,
    total_topups: topups,
    wifi_spent: wifi,
    electricity_spent: elec,
    current_balance: Number(wallet.balance),
    loyalty_points: currentUser.loyalty_points || 0,
    transaction_count: all_t.length,
    monthly_breakdown: [],
  });
}

// ---------- Settings: payment gateways / bank accounts / IoT devices ----------

function genericListHandler(table) {
  return async (_request, env) => json(await all(env, `SELECT * FROM ${table} ORDER BY created_at DESC`));
}

function genericCreateHandler(table, fields) {
  return async (request, env) => {
    const b = await readBody(request);
    const id = uuid();
    const cols = ['id', ...fields, 'created_at'];
    const vals = [id, ...fields.map((f) => b[f] ?? null), nowIso()];
    await run(env, `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, ...vals);
    return json(await one(env, `SELECT * FROM ${table} WHERE id = ?`, id), 201);
  };
}

function genericUpdateHandler(table, fields) {
  return async (request, env, _user, _deps, params) => {
    const b = await readBody(request);
    const sets = []; const binds = [];
    for (const f of fields) if (f in b) { sets.push(`${f} = ?`); binds.push(b[f]); }
    if (!sets.length) return error('No fields');
    sets.push('updated_at = ?'); binds.push(nowIso());
    binds.push(params.id);
    await run(env, `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, ...binds);
    return json(await one(env, `SELECT * FROM ${table} WHERE id = ?`, params.id));
  };
}

function genericDeleteHandler(table) {
  return async (_request, env, _user, _deps, params) => {
    await run(env, `DELETE FROM ${table} WHERE id = ?`, params.id);
    return noContent();
  };
}

export const listPaymentGateways = genericListHandler('payment_gateways');
export const createPaymentGateway = genericCreateHandler('payment_gateways',
  ['name', 'provider', 'merchant_id', 'merchant_key', 'is_sandbox', 'is_active', 'config_json']);
export const updatePaymentGateway = genericUpdateHandler('payment_gateways',
  ['name', 'provider', 'merchant_id', 'merchant_key', 'is_sandbox', 'is_active', 'config_json']);
export const deletePaymentGateway = genericDeleteHandler('payment_gateways');

export const listBankAccounts = genericListHandler('bank_accounts');
export const createBankAccount = genericCreateHandler('bank_accounts',
  ['bank_name', 'account_holder', 'account_number', 'branch_code', 'is_active']);
export const updateBankAccount = genericUpdateHandler('bank_accounts',
  ['bank_name', 'account_holder', 'account_number', 'branch_code', 'is_active']);
export const deleteBankAccount = genericDeleteHandler('bank_accounts');

export const listIotDevices = genericListHandler('iot_devices');
export const createIotDevice = genericCreateHandler('iot_devices',
  ['device_id', 'device_type', 'location', 'status', 'meter_id']);
export const updateIotDevice = genericUpdateHandler('iot_devices',
  ['device_id', 'device_type', 'location', 'status', 'meter_id']);
export const deleteIotDevice = genericDeleteHandler('iot_devices');

// ---------- Referrals ----------

export async function applyReferral(request, env, currentUser) {
  const b = await readBody(request);
  if (!b.referral_code) return error('referral_code required');
  if (currentUser.referred_by) return error('Already used a referral');
  const referrer = await one(env, 'SELECT id FROM users WHERE referral_code = ?', b.referral_code);
  if (!referrer || referrer.id === currentUser.id) return error('Invalid referral code');
  await run(env, 'UPDATE users SET referred_by = ?, loyalty_points = loyalty_points + 50, updated_at = ? WHERE id = ?',
    referrer.id, nowIso(), currentUser.id);
  await run(env, 'UPDATE users SET loyalty_points = loyalty_points + 100 WHERE id = ?', referrer.id);
  return json({ ok: true, points_awarded: 50 });
}

export async function referralStats(_request, env, currentUser) {
  const refs = await all(env, 'SELECT id, phone_number, created_at FROM users WHERE referred_by = ?', currentUser.id);
  return json({
    referral_code: currentUser.referral_code,
    total_referrals: refs.length,
    loyalty_points: currentUser.loyalty_points || 0,
    referrals: refs,
  });
}
