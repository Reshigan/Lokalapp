import { json, readBody, error, noContent } from '../lib/http.js';
import { all, one, run, batch, nowIso } from '../lib/db.js';
import { uuid, transactionRef } from '../lib/ids.js';
import { audit } from '../lib/audit.js';

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
  const q = url.searchParams.get('search') || url.searchParams.get('q');
  const kyc = url.searchParams.get('kyc_status');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, parseInt(url.searchParams.get('page_size') || '20', 10));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const binds = [];
  if (q) {
    where.push('(phone_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like, like, like);
  }
  if (kyc) { where.push('kyc_status = ?'); binds.push(kyc); }

  const totalRow = await one(env, `SELECT COUNT(*) AS c FROM users WHERE ${where.join(' AND ')}`, ...binds);
  const rows = await all(env,
    `SELECT id, phone_number, first_name, last_name, email, kyc_status, status, is_admin, loyalty_points, created_at
     FROM users WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...binds, pageSize, offset);

  return json({ users: rows, total: Number(totalRow?.c || 0), page });
}

export async function auditLogs(_request, env) {
  const rows = await all(
    env,
    `SELECT al.*, u.phone_number, u.first_name, u.last_name
     FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC LIMIT 200`,
  );
  return json({
    audit_logs: rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_phone: r.phone_number || null,
      user_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      old_value: r.old_value,
      new_value: r.new_value,
      created_at: r.created_at,
    })),
  });
}

// ---------- User detail + actions ----------

export async function getUser(_request, env, _user, _deps, params) {
  const u = await one(env, 'SELECT * FROM users WHERE id = ?', params.id);
  if (!u) return error('User not found', 404);
  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', u.id);
  const agent = await one(env, 'SELECT * FROM agents WHERE user_id = ?', u.id);
  return json({ user: u, wallet, agent });
}

export async function updateUserStatus(request, env, currentUser, _deps, params) {
  const url = new URL(request.url);
  const status = url.searchParams.get('new_status') || (await readBody(request)).status;
  if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
    return error('Invalid status');
  }
  const old = await one(env, 'SELECT status FROM users WHERE id = ?', params.id);
  if (!old) return error('User not found', 404);
  await run(env, 'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
    status, nowIso(), params.id);
  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'user.status.update',
    entity_type: 'user', entity_id: params.id,
    old: { status: old.status }, new: { status },
  });
  return json({ message: 'Status updated', status });
}

export async function updateUserKyc(request, env, currentUser, _deps, params) {
  const url = new URL(request.url);
  const status = url.searchParams.get('new_status') || (await readBody(request)).kyc_status;
  if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
    return error('Invalid kyc_status');
  }
  const old = await one(env, 'SELECT kyc_status FROM users WHERE id = ?', params.id);
  if (!old) return error('User not found', 404);
  await run(env, 'UPDATE users SET kyc_status = ?, updated_at = ? WHERE id = ?',
    status, nowIso(), params.id);
  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'user.kyc.update',
    entity_type: 'user', entity_id: params.id,
    old: { kyc_status: old.kyc_status }, new: { kyc_status: status },
  });
  return json({ message: 'KYC updated', kyc_status: status });
}

export async function adjustUserWallet(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  const amt = Number(body.amount);
  if (!Number.isFinite(amt) || amt === 0) return error('non-zero amount required');
  const wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', params.id);
  if (!wallet) return error('Wallet not found', 404);
  const before = Number(wallet.balance);
  const after = before + amt;
  if (after < 0) return error('Adjustment would leave a negative balance');

  const ref = transactionRef();
  await batch(env, [
    {
      // Guard with WHERE balance = ? to detect concurrent updates
      sql: 'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ? AND balance = ?',
      binds: [after, nowIso(), wallet.id, before],
    },
    {
      sql: `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, extra_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 'ADJUST', ?, ?, ?)`,
      binds: [uuid(), wallet.id, amt >= 0 ? 'TOPUP' : 'PURCHASE',
              amt, before, after, ref,
              body.note || 'Admin adjustment',
              JSON.stringify({ kind: 'admin_adjust', actor: currentUser.id, note: body.note || null }),
              nowIso()],
    },
  ]);

  const verify = await one(env, 'SELECT balance FROM wallets WHERE id = ?', wallet.id);
  if (Number(verify.balance) !== after) {
    return error('Concurrent update detected, please retry', 409);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'wallet.adjust',
    entity_type: 'wallet', entity_id: wallet.id,
    old: { balance: before }, new: { balance: after, amount: amt, reference: ref },
  });

  return json({ new_balance: after, reference: ref });
}

// ---------- Agents ----------

export async function listAgents(request, env) {
  const url = new URL(request.url);
  const tier = url.searchParams.get('tier');
  const status = url.searchParams.get('agent_status') || url.searchParams.get('status');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, parseInt(url.searchParams.get('page_size') || '20', 10));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const binds = [];
  if (tier) { where.push('a.tier = ?'); binds.push(tier); }
  if (status) { where.push('a.status = ?'); binds.push(status); }

  const totalRow = await one(env, `SELECT COUNT(*) AS c FROM agents a WHERE ${where.join(' AND ')}`, ...binds);
  const rows = await all(env,
    `SELECT a.*, u.phone_number AS user_phone,
            COALESCE(u.first_name || ' ' || u.last_name, u.phone_number) AS user_name
     FROM agents a JOIN users u ON u.id = a.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    ...binds, pageSize, offset);

  return json({ agents: rows, total: Number(totalRow?.c || 0), page });
}

export async function updateAgentTier(request, env, currentUser, _deps, params) {
  const url = new URL(request.url);
  const tier = url.searchParams.get('new_tier') || (await readBody(request)).tier;
  if (!['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].includes(tier)) return error('Invalid tier');
  const old = await one(env, 'SELECT tier FROM agents WHERE id = ?', params.id);
  if (!old) return error('Agent not found', 404);
  await run(env, 'UPDATE agents SET tier = ?, updated_at = ? WHERE id = ?', tier, nowIso(), params.id);
  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'agent.tier.update',
    entity_type: 'agent', entity_id: params.id,
    old: { tier: old.tier }, new: { tier },
  });
  return json({ tier });
}

export async function updateAgentStatus(request, env, currentUser, _deps, params) {
  const url = new URL(request.url);
  const status = url.searchParams.get('new_status') || (await readBody(request)).status;
  if (!['PENDING', 'ACTIVE', 'SUSPENDED'].includes(status)) return error('Invalid status');
  const old = await one(env, 'SELECT status FROM agents WHERE id = ?', params.id);
  if (!old) return error('Agent not found', 404);
  await run(env, 'UPDATE agents SET status = ?, updated_at = ? WHERE id = ?', status, nowIso(), params.id);
  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'agent.status.update',
    entity_type: 'agent', entity_id: params.id,
    old: { status: old.status }, new: { status },
  });
  return json({ status });
}

export async function adjustAgentFloat(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  const amt = Number(body.amount);
  if (!Number.isFinite(amt) || amt === 0) return error('non-zero amount required');

  const agent = await one(env, 'SELECT user_id, float_balance FROM agents WHERE id = ?', params.id);
  if (!agent) return error('Agent not found', 404);

  const before = Number(agent.float_balance || 0);
  const after = before + amt;
  if (after < 0) return error('Adjustment would leave a negative float');

  // Record on the agent's wallet so it's audit-visible
  const wallet = await one(env, 'SELECT id, balance FROM wallets WHERE user_id = ?', agent.user_id);
  const ref = transactionRef();

  const stmts = [
    {
      sql: 'UPDATE agents SET float_balance = ?, updated_at = ? WHERE id = ? AND float_balance = ?',
      binds: [after, nowIso(), params.id, before],
    },
  ];
  if (wallet) {
    stmts.push({
      sql: `INSERT INTO transactions (id, wallet_id, agent_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, extra_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 'ADJUST', ?, ?, ?)`,
      binds: [uuid(), wallet.id, params.id,
              amt >= 0 ? 'TOPUP' : 'PURCHASE', 0,
              Number(wallet.balance), Number(wallet.balance), ref,
              body.note || `Admin float adjust R${amt.toFixed(2)}`,
              JSON.stringify({ kind: 'admin_float_adjust', actor: currentUser.id, amount: amt, new_float: after }),
              nowIso()],
    });
  }
  await batch(env, stmts);

  const verify = await one(env, 'SELECT float_balance FROM agents WHERE id = ?', params.id);
  if (Number(verify.float_balance) !== after) {
    return error('Concurrent update detected, please retry', 409);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'agent.float.adjust',
    entity_type: 'agent', entity_id: params.id,
    old: { float_balance: before }, new: { float_balance: after, amount: amt, reference: ref },
  });

  return json({ new_float_balance: after, reference: ref });
}

// ---------- Products (admin CRUD) ----------

export async function listAdminWifi(_request, env) {
  return json(await all(env, 'SELECT * FROM wifi_packages ORDER BY sort_order, price'));
}

export async function createAdminWifi(request, env) {
  const b = await readBody(request);
  if (!b.name) return error('name required');
  const price = Number(b.price);
  if (!(Number.isFinite(price) && price >= 0)) return error('price must be ≥ 0');
  if (Number(b.data_limit_mb || 0) < 0) return error('data_limit_mb must be ≥ 0');
  if (Number(b.validity_hours || 0) < 0) return error('validity_hours must be ≥ 0');
  const id = uuid();
  await run(env,
    `INSERT INTO wifi_packages (id, name, description, price, data_limit_mb, validity_hours, is_active, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, b.name, b.description || null, price,
    Number(b.data_limit_mb || 0), Number(b.validity_hours || 0),
    b.is_active === 0 ? 0 : 1, Number(b.sort_order || 0), nowIso(),
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
  if (!b.name) return error('name required');
  const price = Number(b.price);
  if (!(Number.isFinite(price) && price >= 0)) return error('price must be ≥ 0');
  if (Number(b.kwh_amount || 0) < 0) return error('kwh_amount must be ≥ 0');
  if (Number(b.validity_days || 0) < 0) return error('validity_days must be ≥ 0');
  const id = uuid();
  await run(env,
    `INSERT INTO electricity_packages (id, name, description, price, package_type, kwh_amount, validity_days, is_active, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, b.name, b.description || null, price,
    b.package_type || 'UNITS', Number(b.kwh_amount || 0), Number(b.validity_days || 0),
    1, Number(b.sort_order || 0), nowIso(),
  );
  return json(await one(env, 'SELECT * FROM electricity_packages WHERE id = ?', id), 201);
}

// ---------- Reports / Analytics ----------

export async function revenueReport(request, env) {
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '30', 10)));
  const since = `datetime('now', '-${days} days')`;

  const wifi = await one(env, `SELECT COALESCE(SUM(ABS(amount)), 0) AS total FROM transactions WHERE type = 'PURCHASE' AND description LIKE 'WiFi%' AND created_at >= ${since}`);
  const elec = await one(env, `SELECT COALESCE(SUM(ABS(amount)), 0) AS total FROM transactions WHERE type = 'PURCHASE' AND description LIKE 'Electricity%' AND created_at >= ${since}`);
  const other = await one(env, `SELECT COALESCE(SUM(ABS(amount)), 0) AS total FROM transactions WHERE type = 'PURCHASE' AND description NOT LIKE 'WiFi%' AND description NOT LIKE 'Electricity%' AND created_at >= ${since}`);

  const daily = await all(env, `
    SELECT date(created_at) AS date, COALESCE(SUM(ABS(amount)),0) AS amount
    FROM transactions
    WHERE type = 'PURCHASE' AND created_at >= ${since}
    GROUP BY date(created_at) ORDER BY date(created_at)`);

  const wifiV = Number(wifi.total);
  const elecV = Number(elec.total);
  const otherV = Number(other.total);

  return json({
    period_days: days,
    daily_revenue: daily.map((d) => ({ date: d.date, amount: Number(d.amount) })),
    by_product: { wifi: wifiV, electricity: elecV, other: otherV },
    total: wifiV + elecV + otherV,
  });
}

export async function agentReport(request, env) {
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '30', 10)));
  const top = await all(env,
    `SELECT a.id, a.agent_code, a.business_name, a.tier,
            a.total_sales, a.monthly_sales, a.commission_balance,
            u.phone_number
     FROM agents a JOIN users u ON u.id = a.user_id
     ORDER BY a.total_sales DESC LIMIT 50`);
  return json({ period_days: days, top_agents: top });
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

// ---------- Reversals ----------

/** Admin cancels an unpaid invoice. Reverses the household balance accrual. */
export async function cancelInvoice(request, env, currentUser, _deps, params) {
  const inv = await one(env, 'SELECT * FROM electricity_invoices WHERE id = ?', params.id);
  if (!inv) return error('Invoice not found', 404);
  if (inv.status === 'PAID') return error('Cannot cancel a paid invoice — issue a refund instead');
  if (inv.status === 'CANCELLED') return error('Invoice already cancelled');

  await batch(env, [
    {
      sql: `UPDATE electricity_invoices SET status = 'CANCELLED', updated_at = ?
            WHERE id = ? AND status NOT IN ('PAID', 'CANCELLED')`,
      binds: [nowIso(), inv.id],
    },
    {
      // Subtract the unpaid portion from the household's outstanding balance
      sql: 'UPDATE households SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?',
      binds: [Number(inv.total_amount) - Number(inv.amount_paid || 0), nowIso(), inv.household_id],
    },
    // Void any pending collection on this invoice
    {
      sql: `UPDATE cash_collections SET status = 'VOID' WHERE invoice_id = ? AND status = 'PENDING_HOUSEHOLD_CONFIRM'`,
      binds: [inv.id],
    },
  ]);

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'invoice.cancel',
    entity_type: 'invoice', entity_id: inv.id,
    old: { status: inv.status }, new: { status: 'CANCELLED', reason: (await readBody(request))?.reason || null },
  });

  return json({ ok: true });
}

/** Admin voids a pending or confirmed collection. Reverses the invoice + household side-effects. */
export async function voidCollection(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  const c = await one(env, 'SELECT * FROM cash_collections WHERE id = ?', params.id);
  if (!c) return error('Collection not found', 404);
  if (c.status === 'VOID') return error('Already void');
  if (c.settled === 1) return error('Settled collections must be reversed via the settlement, not voided here');

  const inv = await one(env, 'SELECT * FROM electricity_invoices WHERE id = ?', c.invoice_id);

  const stmts = [
    {
      sql: `UPDATE cash_collections SET status = 'VOID', notes = COALESCE(notes,'') || ? WHERE id = ?`,
      binds: [`\n[void] ${body.reason || 'admin'}`, c.id],
    },
  ];
  if (c.status === 'CONFIRMED' && inv) {
    // Reverse the payment
    const newPaid = Math.max(0, Number(inv.amount_paid || 0) - Number(c.amount));
    const newStatus = newPaid >= Number(inv.total_amount) ? 'PAID' : 'ISSUED';
    stmts.push({
      sql: 'UPDATE electricity_invoices SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?',
      binds: [newPaid, newStatus, nowIso(), inv.id],
    });
    stmts.push({
      sql: 'UPDATE households SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
      binds: [Number(c.amount), nowIso(), c.household_id],
    });
  }
  await batch(env, stmts);

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'collection.void',
    entity_type: 'cash_collection', entity_id: c.id,
    old: { status: c.status }, new: { status: 'VOID', reason: body.reason || null },
  });

  return json({ ok: true });
}

/** Refund a wallet transaction by booking the reverse entry. */
export async function refundTransaction(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  const tx = await one(env, 'SELECT * FROM transactions WHERE id = ?', params.id);
  if (!tx) return error('Transaction not found', 404);
  if (tx.status !== 'COMPLETED') return error(`Transaction is ${tx.status}`);
  if (tx.type === 'REFUND') return error('Already a refund');

  const dup = await one(
    env,
    "SELECT id FROM transactions WHERE extra_data LIKE ? AND type = 'REFUND'",
    `%"refund_of":"${tx.id}"%`,
  );
  if (dup) return error('Already refunded', 409);

  const amount = -Number(tx.amount); // reverse the sign
  const wallet = await one(env, 'SELECT balance FROM wallets WHERE id = ?', tx.wallet_id);
  const before = Number(wallet?.balance || 0);
  const after = before + amount;
  if (after < 0) return error('Refund would leave wallet negative');

  const ref = transactionRef();
  await batch(env, [
    {
      sql: 'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ? AND balance = ?',
      binds: [after, nowIso(), tx.wallet_id, before],
    },
    {
      sql: `INSERT INTO transactions (id, wallet_id, agent_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, extra_data, created_at)
            VALUES (?, ?, ?, 'REFUND', ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)`,
      binds: [uuid(), tx.wallet_id, tx.agent_id || null,
              amount, before, after, ref,
              tx.payment_method || 'WALLET',
              `Refund of ${tx.reference} — ${body.reason || 'admin'}`,
              JSON.stringify({ refund_of: tx.id, reason: body.reason || null, actor: currentUser.id }),
              nowIso()],
    },
    {
      sql: "UPDATE transactions SET status = 'REVERSED', updated_at = ? WHERE id = ?",
      binds: [nowIso(), tx.id],
    },
  ]);

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'transaction.refund',
    entity_type: 'transaction', entity_id: tx.id,
    new: { reference: ref, amount, reason: body.reason || null },
  });

  return json({ ok: true, reference: ref, new_balance: after });
}

// ---------- Reconciliation ----------

export async function reconciliation(_request, env) {
  const outstanding = await one(env, `
    SELECT COALESCE(SUM(total_amount - amount_paid), 0) AS v, COUNT(*) AS c
    FROM electricity_invoices
    WHERE status IN ('ISSUED', 'OVERDUE', 'PARTIAL')`);
  const householdBalances = await one(env, `
    SELECT COALESCE(SUM(current_balance), 0) AS v
    FROM households WHERE status = 'ACTIVE'`);
  const cashOnHand = await one(env, `
    SELECT COALESCE(SUM(amount), 0) AS v, COUNT(*) AS c
    FROM cash_collections
    WHERE settled = 0 AND status = 'CONFIRMED'`);
  const settledToday = await one(env, `
    SELECT COALESCE(SUM(confirmed_amount), 0) AS v, COUNT(*) AS c
    FROM agent_settlements
    WHERE status = 'CONFIRMED' AND date(office_confirmed_at) = date('now')`);
  const disputed = await one(env, `
    SELECT COUNT(*) AS c FROM agent_settlements WHERE status = 'DISPUTED'`);
  const submittedSettlements = await one(env, `
    SELECT COALESCE(SUM(declared_amount), 0) AS v, COUNT(*) AS c
    FROM agent_settlements WHERE status = 'SUBMITTED'`);
  const agentFloatTotal = await one(env, `
    SELECT COALESCE(SUM(float_balance), 0) AS v FROM agents WHERE status = 'ACTIVE'`);
  const walletTotal = await one(env, `SELECT COALESCE(SUM(balance), 0) AS v FROM wallets`);
  const commissionTotal = await one(env, `
    SELECT COALESCE(SUM(commission_balance), 0) AS v FROM agents`);

  // Sanity check: invoice outstanding should ≈ household current_balance
  const drift = Number(outstanding.v) - Number(householdBalances.v);

  return json({
    outstanding_invoices: { amount: Number(outstanding.v), count: Number(outstanding.c) },
    household_balances:   { amount: Number(householdBalances.v) },
    drift_invoices_vs_household: drift,
    cash_on_hand_unsettled: { amount: Number(cashOnHand.v), count: Number(cashOnHand.c) },
    settlements_pending:  { amount: Number(submittedSettlements.v), count: Number(submittedSettlements.c) },
    settled_today:        { amount: Number(settledToday.v), count: Number(settledToday.c) },
    disputed_settlements: { count: Number(disputed.c) },
    agent_float_total:    Number(agentFloatTotal.v),
    agent_commission_total: Number(commissionTotal.v),
    wallet_total:         Number(walletTotal.v),
    generated_at: nowIso(),
  });
}

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
