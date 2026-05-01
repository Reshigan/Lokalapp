import { json, readBody, error } from '../lib/http.js';
import { one, all, run, nowIso } from '../lib/db.js';
import { uuid, agentCode } from '../lib/ids.js';

const COMMISSION_RATES = { BRONZE: 0.05, SILVER: 0.07, GOLD: 0.10, PLATINUM: 0.12 };

function publicAgent(a) {
  return {
    id: a.id,
    user_id: a.user_id,
    agent_code: a.agent_code,
    business_name: a.business_name,
    business_type: a.business_type,
    tier: a.tier,
    float_balance: Number(a.float_balance || 0),
    commission_balance: Number(a.commission_balance || 0),
    total_sales: Number(a.total_sales || 0),
    monthly_sales: Number(a.monthly_sales || 0),
    status: a.status,
    low_float_threshold: Number(a.low_float_threshold || 100),
    commission_rate: COMMISSION_RATES[a.tier] || 0.05,
  };
}

export async function registerAgent(request, env, currentUser) {
  const body = await readBody(request);
  const existing = await one(env, 'SELECT id FROM agents WHERE user_id = ?', currentUser.id);
  if (existing) return error('Already registered as an agent', 400);
  if (currentUser.kyc_status !== 'VERIFIED') {
    return error('KYC verification required to become an agent', 403);
  }
  const id = uuid();
  await run(
    env,
    `INSERT INTO agents (id, user_id, agent_code, business_name, business_type, tier,
       float_balance, commission_balance, total_sales, monthly_sales, status,
       low_float_threshold, address, location_lat, location_lng, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'BRONZE', 0, 0, 0, 0, 'ACTIVE', 100, ?, ?, ?, ?, ?)`,
    id, currentUser.id, agentCode(),
    String(body.business_name || ''),
    String(body.business_type || 'OTHER'),
    body.address || null,
    body.location_lat || null, body.location_lng || null,
    nowIso(), nowIso(),
  );
  // Grant AGENT role
  await run(
    env,
    `INSERT INTO user_roles (id, user_id, role, granted_by_user_id, granted_at)
     VALUES (?, ?, 'AGENT', ?, ?)`,
    uuid(), currentUser.id, currentUser.id, nowIso(),
  );
  const created = await one(env, 'SELECT * FROM agents WHERE id = ?', id);
  return json(publicAgent(created), 201);
}

export async function getAgentProfile(_request, _env, _currentUser, deps) {
  return json(publicAgent(deps.agent));
}

export async function getFloat(_request, _env, _currentUser, deps) {
  return json({
    float_balance: Number(deps.agent.float_balance || 0),
    low_float_threshold: Number(deps.agent.low_float_threshold || 100),
    is_low: Number(deps.agent.float_balance) <= Number(deps.agent.low_float_threshold),
  });
}

export async function topupFloat(request, env, _currentUser, deps) {
  const body = await readBody(request);
  const amt = Number(body.amount);
  if (!(amt > 0)) return error('amount must be > 0');
  const newBalance = Number(deps.agent.float_balance || 0) + amt;
  await run(env, 'UPDATE agents SET float_balance = ?, updated_at = ? WHERE id = ?',
    newBalance, nowIso(), deps.agent.id);
  return json({ new_float_balance: newBalance });
}

export async function getAlerts(_request, env, _currentUser, deps) {
  // Simple derived alert: float low.
  const isLow = Number(deps.agent.float_balance) <= Number(deps.agent.low_float_threshold);
  return json({
    alerts: isLow ? [{
      id: 'derived-low-float',
      alert_type: 'LOW_FLOAT',
      threshold: Number(deps.agent.low_float_threshold),
      current_balance: Number(deps.agent.float_balance),
      message: 'Float balance below threshold',
      is_read: false,
      created_at: nowIso(),
    }] : [],
    current_float: Number(deps.agent.float_balance),
    low_float_threshold: Number(deps.agent.low_float_threshold),
    is_low: isLow,
  });
}

export async function updateAlertSettings(request, env, _currentUser, deps) {
  const body = await readBody(request);
  const t = Number(body.low_float_threshold);
  if (!(t >= 0)) return error('low_float_threshold must be >= 0');
  await run(env, 'UPDATE agents SET low_float_threshold = ?, updated_at = ? WHERE id = ?',
    t, nowIso(), deps.agent.id);
  return json({ low_float_threshold: t });
}

export async function listCustomers(request, env, _currentUser, deps) {
  // Customers in the postpaid model = households the agent registered.
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  let sql = 'SELECT id, account_number, primary_contact_name AS name, primary_contact_phone AS phone, current_balance FROM households WHERE registered_by_agent_id = ?';
  const binds = [deps.agent.id];
  if (q) {
    sql += ' AND (account_number LIKE ? OR primary_contact_name LIKE ? OR primary_contact_phone LIKE ?)';
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const rows = await all(env, sql, ...binds);
  return json(rows);
}

// ---------- Customer register / search / detail ----------

function normalizePhone(p) {
  if (!p) return '';
  p = String(p).replace(/[^\d+]/g, '');
  if (p.startsWith('0')) p = '+27' + p.slice(1);
  else if (!p.startsWith('+')) p = '+27' + p;
  return p;
}

export async function searchCustomers(request, env, _user, deps) {
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');
  const name = url.searchParams.get('name');
  let sql = `SELECT u.id, u.phone_number, u.first_name, u.last_name, u.kyc_status
             FROM users u
             JOIN agent_customers ac ON ac.user_id = u.id
             WHERE ac.agent_id = ?`;
  const binds = [deps.agent.id];
  if (phone) { sql += ' AND u.phone_number LIKE ?'; binds.push(`%${phone}%`); }
  if (name) { sql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ?)'; binds.push(`%${name}%`, `%${name}%`); }
  sql += ' ORDER BY u.created_at DESC LIMIT 50';
  const rows = await all(env, sql, ...binds);
  return json(rows);
}

export async function registerCustomer(request, env, _user, deps) {
  const body = await readBody(request);
  const phone = normalizePhone(body.phone_number);
  if (!phone) return error('phone_number required');
  let user = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  if (!user) {
    const id = uuid();
    await run(
      env,
      `INSERT INTO users (id, phone_number, first_name, last_name, kyc_status, status, referral_code, loyalty_points, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'PENDING', 'ACTIVE', ?, 0, ?, ?)`,
      id, phone, body.first_name || null, body.last_name || null,
      ('REF' + crypto.randomUUID().slice(0, 6).toUpperCase()),
      nowIso(), nowIso(),
    );
    user = await one(env, 'SELECT * FROM users WHERE id = ?', id);
    // create wallet
    await run(
      env,
      `INSERT INTO wallets (id, user_id, balance, currency, status, daily_limit, monthly_limit,
       daily_spent, monthly_spent, created_at, updated_at) VALUES (?, ?, 0, 'ZAR', 'ACTIVE', 5000, 50000, 0, 0, ?, ?)`,
      uuid(), user.id, nowIso(), nowIso(),
    );
  }
  // Link agent → customer
  const existing = await one(
    env, 'SELECT id FROM agent_customers WHERE agent_id = ? AND user_id = ?', deps.agent.id, user.id,
  );
  if (!existing) {
    await run(
      env,
      `INSERT INTO agent_customers (id, agent_id, user_id, customer_phone, customer_name, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uuid(), deps.agent.id, user.id, user.phone_number,
      [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      body.notes || null, nowIso(),
    );
  }
  return json({
    message: 'Customer registered',
    customer_id: user.id,
    user_id: user.id,
    phone_number: user.phone_number,
    referral_bonus_earned: 0,
  }, 201);
}

export async function customerDetail(_request, env, _user, deps, params) {
  const u = await one(env, 'SELECT * FROM users WHERE id = ?', params.id);
  if (!u) return error('Customer not found', 404);
  const link = await one(env, 'SELECT * FROM agent_customers WHERE agent_id = ? AND user_id = ?',
    deps.agent.id, u.id);
  // Purchase history = transactions on this user's wallet
  const wallet = await one(env, 'SELECT id FROM wallets WHERE user_id = ?', u.id);
  const txs = wallet ? await all(
    env,
    `SELECT id, type, amount, description, created_at FROM transactions WHERE wallet_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT 50`,
    wallet.id, deps.agent.id,
  ) : [];
  return json({
    customer: {
      id: u.id,
      customer_phone: u.phone_number,
      customer_name: [u.first_name, u.last_name].filter(Boolean).join(' ') || null,
      notes: link?.notes || null,
      total_purchases: Number(link?.total_purchases || 0),
      last_purchase_at: link?.last_purchase_at || null,
    },
    purchase_history: txs.map((t) => ({
      id: t.id,
      product_type: 'OTHER',
      product_name: t.description || t.type,
      amount: Math.abs(Number(t.amount)),
      created_at: t.created_at,
    })),
  });
}

// ---------- Process customer transaction (sell WiFi/electricity to a customer) ----------

const COMMISSION_BY_TIER = COMMISSION_RATES;

export async function processTransaction(request, env, _user, deps) {
  const body = await readBody(request);
  // body: { customer_phone, product_type: 'WIFI'|'ELECTRICITY', package_id, meter_id?, idempotency_key? }
  const phone = normalizePhone(body.customer_phone);
  const customer = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  if (!customer) return error('Customer not found', 404);

  let pkg = null;
  if (body.product_type === 'WIFI') {
    pkg = await one(env, 'SELECT * FROM wifi_packages WHERE id = ? AND is_active = 1', body.package_id);
  } else if (body.product_type === 'ELECTRICITY') {
    pkg = await one(env, 'SELECT * FROM electricity_packages WHERE id = ? AND is_active = 1', body.package_id);
  } else {
    return error('product_type must be WIFI or ELECTRICITY');
  }
  if (!pkg) return error('Package not found', 404);

  if (Number(deps.agent.float_balance) < Number(pkg.price)) {
    return error('Insufficient agent float');
  }

  const commissionRate = COMMISSION_BY_TIER[deps.agent.tier] || 0.05;
  const commission = Math.round(Number(pkg.price) * commissionRate * 100) / 100;

  const txId = uuid();
  // Debit agent float, accrue commission
  await run(
    env,
    `UPDATE agents SET float_balance = float_balance - ?, commission_balance = commission_balance + ?,
       total_sales = total_sales + ?, monthly_sales = monthly_sales + ?, updated_at = ? WHERE id = ?`,
    Number(pkg.price), commission, Number(pkg.price), Number(pkg.price), nowIso(), deps.agent.id,
  );

  await run(
    env,
    `INSERT INTO transactions (id, wallet_id, agent_id, type, amount, balance_before, balance_after,
       reference, status, payment_method, description, created_at)
     SELECT ?, w.id, ?, 'PURCHASE', ?, w.balance, w.balance, ?, 'COMPLETED', 'AGENT', ?, ?
     FROM wallets w WHERE w.user_id = ?`,
    txId, deps.agent.id, -Number(pkg.price),
    'TXN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    `${body.product_type} via agent ${deps.agent.business_name}: ${pkg.name}`,
    nowIso(), customer.id,
  );

  // Commission ledger
  await run(
    env,
    `INSERT INTO agent_commissions (id, agent_id, transaction_id, type, amount, description, created_at)
     VALUES (?, ?, ?, 'EARNED', ?, ?, ?)`,
    uuid(), deps.agent.id, txId, commission,
    `Commission ${(commissionRate * 100).toFixed(0)}% on ${pkg.name}`, nowIso(),
  );

  // Provision the product
  let voucherCodeOut;
  if (body.product_type === 'WIFI') {
    voucherCodeOut = 'V' + Math.random().toString(36).slice(2, 14).toUpperCase();
    await run(
      env,
      `INSERT INTO wifi_vouchers (id, user_id, package_id, voucher_code, status, data_limit_mb, validity_hours, created_at)
       VALUES (?, ?, ?, ?, 'UNUSED', ?, ?, ?)`,
      uuid(), customer.id, pkg.id,
      voucherCodeOut,
      pkg.data_limit_mb, pkg.validity_hours, nowIso(),
    );
  } else if (body.product_type === 'ELECTRICITY' && body.meter_id) {
    await run(
      env, 'UPDATE electricity_meters SET kwh_balance = kwh_balance + ? WHERE id = ? AND user_id = ?',
      Number(pkg.kwh_amount || 0), body.meter_id, customer.id,
    );
  }

  // Update agent_customers totals
  await run(
    env,
    `UPDATE agent_customers SET total_purchases = total_purchases + ?, last_purchase_at = ? WHERE agent_id = ? AND user_id = ?`,
    Number(pkg.price), nowIso(), deps.agent.id, customer.id,
  );

  return json({
    transaction_id: txId,
    reference: 'TXN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    voucher_code: voucherCodeOut,
    amount: Number(pkg.price),
    commission_earned: commission,
    new_float_balance: Number(deps.agent.float_balance) - Number(pkg.price),
  }, 201);
}

// ---------- Commissions ----------

export async function getCommissions(_request, env, _user, deps) {
  const ledger = await all(
    env,
    'SELECT * FROM agent_commissions WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100',
    deps.agent.id,
  );
  const totalEarned = ledger.reduce((s, r) => r.type === 'EARNED' ? s + Number(r.amount) : s, 0);
  return json({
    balance: Number(deps.agent.commission_balance || 0),
    pending: 0,
    total_earned: totalEarned,
    rate: COMMISSION_BY_TIER[deps.agent.tier] || 0.05,
    tier: deps.agent.tier,
    transactions: ledger.map((r) => ({
      id: r.id,
      amount: 0,
      commission: Number(r.amount),
      description: r.description || r.type,
      created_at: r.created_at,
    })),
    history: ledger,
  });
}

export async function withdrawCommission(request, env, _user, deps) {
  const body = await readBody(request);
  const amt = Number(body.amount);
  if (!(amt > 0)) return error('amount must be > 0');
  const balance = Number(deps.agent.commission_balance || 0);
  if (amt > balance) return error('Insufficient commission balance');

  // Move to wallet
  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', deps.agent.user_id);
  if (!wallet) return error('Agent has no wallet');
  await run(env, 'UPDATE agents SET commission_balance = commission_balance - ?, updated_at = ? WHERE id = ?',
    amt, nowIso(), deps.agent.id);
  const before = Number(wallet.balance);
  const after = before + amt;
  await run(env, 'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', after, nowIso(), wallet.id);
  await run(
    env,
    `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after,
       reference, status, payment_method, description, created_at)
     VALUES (?, ?, 'COMMISSION', ?, ?, ?, ?, 'COMPLETED', 'AGENT', ?, ?)`,
    uuid(), wallet.id, amt, before, after,
    'CMW' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    'Commission withdrawal', nowIso(),
  );
  await run(
    env,
    `INSERT INTO agent_commissions (id, agent_id, type, amount, description, created_at)
     VALUES (?, ?, 'WITHDRAWN', ?, ?, ?)`,
    uuid(), deps.agent.id, amt, 'Withdrawal to wallet', nowIso(),
  );
  return json({ amount: amt, new_balance: balance - amt, new_wallet_balance: after });
}

export async function salesReport(_request, env, _currentUser, deps) {
  const today = await one(env, `
    SELECT COUNT(*) AS c, COALESCE(SUM(ABS(amount)),0) AS s
    FROM transactions
    WHERE agent_id = ? AND type = 'PURCHASE'
      AND date(created_at) = date('now')`, deps.agent.id);
  const week = await one(env, `
    SELECT COUNT(*) AS c, COALESCE(SUM(ABS(amount)),0) AS s
    FROM transactions
    WHERE agent_id = ? AND type = 'PURCHASE'
      AND created_at >= datetime('now', '-7 days')`, deps.agent.id);
  const month = await one(env, `
    SELECT COUNT(*) AS c, COALESCE(SUM(ABS(amount)),0) AS s
    FROM transactions
    WHERE agent_id = ? AND type = 'PURCHASE'
      AND created_at >= datetime('now', '-30 days')`, deps.agent.id);
  const todayCommission = await one(env, `
    SELECT COALESCE(SUM(amount),0) AS s FROM agent_commissions
    WHERE agent_id = ? AND type = 'EARNED' AND date(created_at) = date('now')`, deps.agent.id);
  const monthCommission = await one(env, `
    SELECT COALESCE(SUM(amount),0) AS s FROM agent_commissions
    WHERE agent_id = ? AND type = 'EARNED' AND created_at >= datetime('now', '-30 days')`, deps.agent.id);
  const daily = await all(env, `
    SELECT date(created_at) AS date,
           COALESCE(SUM(ABS(amount)),0) AS sales,
           COUNT(*) AS count
    FROM transactions
    WHERE agent_id = ? AND type = 'PURCHASE'
      AND created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at) ORDER BY date(created_at)`, deps.agent.id);

  const invoiceSums = await one(env, `
    SELECT COUNT(*) AS num_invoices,
           COALESCE(SUM(total_amount),0) AS total_billed,
           COALESCE(SUM(amount_paid),0) AS total_paid
    FROM electricity_invoices WHERE issued_by_agent_id = ?`, deps.agent.id);
  const cashSums = await one(env, `
    SELECT COUNT(*) AS num_collections,
           COALESCE(SUM(amount),0) AS total_collected
    FROM cash_collections WHERE agent_id = ? AND status = 'CONFIRMED'`, deps.agent.id);

  return json({
    today:   { sales: Number(today.s),  count: Number(today.c),  commission: Number(todayCommission.s) },
    week:    { sales: Number(week.s),   count: Number(week.c) },
    month:   { sales: Number(month.s),  count: Number(month.c),  commission: Number(monthCommission.s) },
    daily_breakdown: daily.map((d) => ({ date: d.date, sales: Number(d.sales), count: Number(d.count) })),
    total_sales: Number(deps.agent.total_sales || 0),
    commission_balance: Number(deps.agent.commission_balance || 0),
    invoices: invoiceSums,
    collections: cashSums,
    monthly_sales: Number(deps.agent.monthly_sales || 0),
  });
}
