import { json, readBody, error } from '../lib/http.js';
import { one, all, run, batch, nowIso } from '../lib/db.js';
import { uuid, agentCode, transactionRef, voucherCode } from '../lib/ids.js';
import { getIdempotencyKey } from '../lib/idempotency.js';
import { audit } from '../lib/audit.js';

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

export async function topupFloat(request, env, currentUser, deps) {
  const body = await readBody(request);
  const idempotencyKey = getIdempotencyKey(request, body);
  const amt = Number(body.amount);
  if (!(amt > 0)) return error('amount must be > 0');

  if (idempotencyKey) {
    const seen = await one(env, 'SELECT * FROM transactions WHERE idempotency_key = ?', idempotencyKey);
    if (seen) {
      const a = await one(env, 'SELECT float_balance FROM agents WHERE id = ?', deps.agent.id);
      return json({ new_float_balance: Number(a.float_balance), replayed: true });
    }
  }

  // Float top-ups are recorded as transactions on the agent's own wallet so
  // there's a money-flow audit trail.
  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', deps.agent.user_id);
  if (!wallet) return error('Agent has no wallet');

  const before = Number(wallet.balance);
  const txId = uuid();
  const ref = transactionRef();
  const newFloat = Number(deps.agent.float_balance || 0) + amt;

  await batch(env, [
    {
      sql: 'UPDATE agents SET float_balance = float_balance + ?, updated_at = ? WHERE id = ?',
      binds: [amt, nowIso(), deps.agent.id],
    },
    // Record the float topup as a 0-net transaction on the agent's wallet so it's audit-visible.
    // Future: if the float is funded from the wallet, this would also debit the wallet.
    {
      sql: `INSERT INTO transactions (id, wallet_id, agent_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, idempotency_key, extra_data, created_at)
            VALUES (?, ?, ?, 'TOPUP', ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?)`,
      binds: [txId, wallet.id, deps.agent.id, 0, before, before, ref,
              body.payment_method || 'CARD',
              `Float top-up R${amt.toFixed(2)}`,
              idempotencyKey,
              JSON.stringify({ kind: 'float_topup', amount: amt, new_float: newFloat }),
              nowIso()],
    },
  ]);

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'agent.float.topup',
    entity_type: 'agent', entity_id: deps.agent.id,
    new: { amount: amt, new_float_balance: newFloat, reference: ref },
  });

  return json({ new_float_balance: newFloat, reference: ref, transaction_id: txId });
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
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+27' + p.slice(1);
  if (p.startsWith('27')) return '+' + p;
  return '+27' + p;
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

export async function processTransaction(request, env, currentUser, deps) {
  const body = await readBody(request);
  const idempotencyKey = getIdempotencyKey(request, body);

  const phone = normalizePhone(body.customer_phone);
  let customer = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  if (!customer) {
    // Auto-register the customer with a placeholder user record so the seller
    // doesn't have to pre-register them. They can claim the account later by
    // signing in with this phone via OTP.
    const newId = uuid();
    await run(
      env,
      `INSERT INTO users (id, phone_number, kyc_status, status, referral_code, loyalty_points, created_at, updated_at)
       VALUES (?, ?, 'PENDING', 'ACTIVE', ?, 0, ?, ?)`,
      newId, phone,
      'REF' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      nowIso(), nowIso(),
    );
    customer = await one(env, 'SELECT * FROM users WHERE id = ?', newId);
  }

  // Anti-fraud: sellers can't process their own purchases.
  if (customer.id === currentUser.id) {
    return error('You cannot process your own purchases', 403);
  }

  let pkg = null;
  if (body.product_type === 'WIFI') {
    pkg = await one(env, 'SELECT * FROM wifi_packages WHERE id = ? AND is_active = 1', body.package_id);
  } else if (body.product_type === 'ELECTRICITY') {
    pkg = await one(env, 'SELECT * FROM electricity_packages WHERE id = ? AND is_active = 1', body.package_id);
  } else {
    return error('product_type must be WIFI or ELECTRICITY');
  }
  if (!pkg) return error('Package not found', 404);

  if (idempotencyKey) {
    const seen = await one(env, 'SELECT * FROM transactions WHERE idempotency_key = ?', idempotencyKey);
    if (seen) {
      const extra = (() => { try { return JSON.parse(seen.extra_data || '{}'); } catch { return {}; } })();
      return json({
        transaction_id: seen.id, reference: seen.reference,
        voucher_code: extra.voucher_code, amount: Math.abs(Number(seen.amount)),
        commission_earned: Number(extra.commission || 0),
        new_wallet_balance: Number(seen.balance_after),
        replayed: true,
      });
    }
  }

  const price = Number(pkg.price);

  // Sales-register model: the seller's own wallet is the cash register.
  // - Selling a voucher CREDITS the seller's wallet by the price (cash collected).
  // - The customer pays cash directly — no customer wallet debit.
  // - The float concept is gone; OFFICE_MANAGER without an agents row works the same.
  const sellerWallet = await one(env, 'SELECT id, balance FROM wallets WHERE user_id = ?', currentUser.id);
  if (!sellerWallet) return error('Seller wallet missing');
  const wBefore = Number(sellerWallet.balance);
  const wAfter = wBefore + price;

  // Commission: only agents (with an agents row) earn commission. Office
  // managers acting as direct sellers don't.
  const commissionRate = deps.agent ? (COMMISSION_BY_TIER[deps.agent.tier] || 0.05) : 0;
  const commission = Math.round(price * commissionRate * 100) / 100;

  const txId = uuid();
  const ref = transactionRef();
  let voucherCodeOut, voucherId;

  const stmts = [
    // Credit the seller's wallet — sales register
    {
      sql: 'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ? AND balance = ?',
      binds: [price, nowIso(), sellerWallet.id, wBefore],
    },
    // Sale transaction recorded on the seller's wallet
    {
      sql: `INSERT INTO transactions (id, wallet_id, agent_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, idempotency_key, extra_data, created_at)
            VALUES (?, ?, ?, 'PURCHASE', ?, ?, ?, ?, 'COMPLETED', 'CASH', ?, ?, ?, ?)`,
      binds: [
        txId, sellerWallet.id, deps.agent ? deps.agent.id : null,
        price, wBefore, wAfter, ref,
        `Sale: ${pkg.name} to ${customer.phone_number}`,
        idempotencyKey,
        '__placeholder__',
        nowIso(),
      ],
    },
  ];

  if (deps.agent && commission > 0) {
    stmts.push({
      sql: `UPDATE agents SET commission_balance = commission_balance + ?,
              total_sales = total_sales + ?, monthly_sales = monthly_sales + ?, updated_at = ? WHERE id = ?`,
      binds: [commission, price, price, nowIso(), deps.agent.id],
    });
    stmts.push({
      sql: `INSERT INTO agent_commissions (id, agent_id, transaction_id, type, amount, description, created_at)
            VALUES (?, ?, ?, 'EARNED', ?, ?, ?)`,
      binds: [uuid(), deps.agent.id, txId, commission,
              `Commission ${(commissionRate * 100).toFixed(0)}% on ${pkg.name}`, nowIso()],
    });
  }

  // Provision product to customer
  if (body.product_type === 'WIFI') {
    voucherId = uuid();
    voucherCodeOut = 'V' + Math.random().toString(36).slice(2, 14).toUpperCase();
    stmts.push({
      sql: `INSERT INTO wifi_vouchers (id, user_id, package_id, voucher_code, status,
              data_limit_mb, validity_hours, created_at)
            VALUES (?, ?, ?, ?, 'UNUSED', ?, ?, ?)`,
      binds: [voucherId, customer.id, pkg.id, voucherCodeOut, pkg.data_limit_mb, pkg.validity_hours, nowIso()],
    });
  } else if (body.product_type === 'ELECTRICITY' && body.meter_id) {
    const isUnlimited = (pkg.package_type || '').toUpperCase() === 'UNLIMITED';
    const validityDays = Number(pkg.validity_days || 0);
    if (isUnlimited && validityDays > 0) {
      // Extend unlimited expiry by validity_days from the *later of* now or
      // current expiry — so renewing early doesn't truncate the existing
      // unused days, and renewing late starts from now.
      const meterRow = await one(env, 'SELECT unlimited_expires_at FROM electricity_meters WHERE id = ?', body.meter_id);
      const fromTs = Math.max(
        Date.now(),
        meterRow?.unlimited_expires_at ? new Date(meterRow.unlimited_expires_at).getTime() : 0,
      );
      const expiresAt = new Date(fromTs + validityDays * 86400_000).toISOString();
      stmts.push({
        sql: 'UPDATE electricity_meters SET unlimited_expires_at = ?, updated_at = ? WHERE id = ?',
        binds: [expiresAt, nowIso(), body.meter_id],
      });
    } else if (Number(pkg.kwh_amount || 0) > 0) {
      stmts.push({
        sql: 'UPDATE electricity_meters SET kwh_balance = kwh_balance + ? WHERE id = ?',
        binds: [Number(pkg.kwh_amount || 0), body.meter_id],
      });
    }
  }

  // Patch extra_data
  stmts[1].binds[10] = JSON.stringify({
    product: body.product_type,
    package_id: pkg.id,
    voucher_id: voucherId || null,
    voucher_code: voucherCodeOut || null,
    meter_id: body.meter_id || null,
    commission,
    customer_id: customer.id,
  });

  await batch(env, stmts);

  // Verify the wallet credit landed (concurrent update guard)
  const updated = await one(env, 'SELECT balance FROM wallets WHERE id = ?', sellerWallet.id);
  if (Number(updated.balance) !== wAfter) {
    return error('Concurrent update — please retry', 409);
  }

  return json({
    transaction_id: txId,
    reference: ref,
    voucher_code: voucherCodeOut,
    amount: price,
    commission_earned: commission,
    new_wallet_balance: wAfter,
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

export async function withdrawCommission(request, env, currentUser, deps) {
  const body = await readBody(request);
  const idempotencyKey = getIdempotencyKey(request, body);
  const amt = Number(body.amount);
  if (!(amt > 0)) return error('amount must be > 0');

  if (idempotencyKey) {
    const seen = await one(env, 'SELECT * FROM transactions WHERE idempotency_key = ?', idempotencyKey);
    if (seen) {
      const a = await one(env, 'SELECT commission_balance FROM agents WHERE id = ?', deps.agent.id);
      return json({
        amount: amt,
        new_balance: Number(a.commission_balance),
        new_wallet_balance: Number(seen.balance_after),
        replayed: true,
      });
    }
  }

  const balance = Number(deps.agent.commission_balance || 0);
  if (amt > balance) return error('Insufficient commission balance');

  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', deps.agent.user_id);
  if (!wallet) return error('Agent has no wallet');

  const before = Number(wallet.balance);
  const after = before + amt;
  const ref = transactionRef();

  await batch(env, [
    {
      sql: 'UPDATE agents SET commission_balance = commission_balance - ?, updated_at = ? WHERE id = ? AND commission_balance >= ?',
      binds: [amt, nowIso(), deps.agent.id, amt],
    },
    {
      sql: 'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
      binds: [amt, nowIso(), wallet.id],
    },
    {
      sql: `INSERT INTO transactions (id, wallet_id, agent_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, idempotency_key, created_at)
            VALUES (?, ?, ?, 'COMMISSION', ?, ?, ?, ?, 'COMPLETED', 'AGENT', ?, ?, ?)`,
      binds: [uuid(), wallet.id, deps.agent.id, amt, before, after, ref,
              'Commission withdrawal', idempotencyKey, nowIso()],
    },
    {
      sql: `INSERT INTO agent_commissions (id, agent_id, type, amount, description, created_at)
            VALUES (?, ?, 'WITHDRAWN', ?, ?, ?)`,
      binds: [uuid(), deps.agent.id, amt, 'Withdrawal to wallet', nowIso()],
    },
  ]);

  // Verify
  const updated = await one(env, 'SELECT commission_balance FROM agents WHERE id = ?', deps.agent.id);
  if (Number(updated.commission_balance) === balance) {
    return error('Concurrent update — commission not debited, please retry', 409);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'agent.commission.withdraw',
    entity_type: 'agent', entity_id: deps.agent.id,
    new: { amount: amt, reference: ref },
  });

  return json({ amount: amt, new_balance: balance - amt, new_wallet_balance: after, reference: ref });
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
