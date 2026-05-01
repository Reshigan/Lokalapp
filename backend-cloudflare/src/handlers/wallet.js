import { json, readBody, error } from '../lib/http.js';
import { one, all, run, nowIso } from '../lib/db.js';
import { uuid, transactionRef } from '../lib/ids.js';

async function getOrCreateWallet(env, userId) {
  let w = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', userId);
  if (!w) {
    const id = uuid();
    await run(
      env,
      `INSERT INTO wallets (id, user_id, balance, currency, status,
       daily_limit, monthly_limit, daily_spent, monthly_spent, created_at, updated_at)
       VALUES (?, ?, 0, 'ZAR', 'ACTIVE', 5000, 50000, 0, 0, ?, ?)`,
      id, userId, nowIso(), nowIso(),
    );
    w = await one(env, 'SELECT * FROM wallets WHERE id = ?', id);
  }
  return w;
}

export async function getWallet(_request, env, currentUser) {
  const w = await getOrCreateWallet(env, currentUser.id);
  return json(w);
}

export async function listTransactions(request, env, currentUser) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, parseInt(url.searchParams.get('page_size') || url.searchParams.get('limit') || '20', 10));
  const offset = (page - 1) * pageSize;
  const w = await getOrCreateWallet(env, currentUser.id);
  const txs = await all(
    env,
    'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    w.id, pageSize, offset,
  );
  const totalRow = await all(env, 'SELECT COUNT(*) AS c FROM transactions WHERE wallet_id = ?', w.id);
  const total = Number(totalRow?.[0]?.c || 0);
  return json({
    transactions: txs,
    total,
    page,
    has_more: offset + txs.length < total,
  });
}

export async function topup(request, env, currentUser) {
  const body = await readBody(request);
  const amount = Number(body.amount);
  if (!(amount > 0)) return error('amount must be > 0');
  const w = await getOrCreateWallet(env, currentUser.id);
  const before = Number(w.balance);
  const after = before + amount;
  await run(env, 'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?',
    after, nowIso(), w.id);
  await run(
    env,
    `INSERT INTO transactions (id, wallet_id, type, amount, fee, balance_before, balance_after,
     reference, status, payment_method, description, created_at)
     VALUES (?, ?, 'TOPUP', ?, 0, ?, ?, ?, 'COMPLETED', ?, ?, ?)`,
    uuid(), w.id, amount, before, after, transactionRef(),
    body.payment_method || 'CARD', body.description || 'Wallet top-up',
    nowIso(),
  );
  return json({ new_balance: after });
}

export async function transfer(request, env, currentUser) {
  const body = await readBody(request);
  const amount = Number(body.amount);
  if (!(amount > 0)) return error('amount must be > 0');
  const phone = String(body.recipient_phone || '').replace(/[^\d+]/g, '');
  if (!phone) return error('recipient_phone required');
  const recipient = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  if (!recipient) return error('Recipient not found');
  if (recipient.id === currentUser.id) return error('Cannot transfer to yourself');

  const sender = await getOrCreateWallet(env, currentUser.id);
  if (Number(sender.balance) < amount) return error('Insufficient balance');
  const recipientWallet = await getOrCreateWallet(env, recipient.id);

  const sBefore = Number(sender.balance);
  const sAfter = sBefore - amount;
  const rBefore = Number(recipientWallet.balance);
  const rAfter = rBefore + amount;
  await run(env, 'UPDATE wallets SET balance = ?, daily_spent = daily_spent + ?, updated_at = ? WHERE id = ?',
    sAfter, amount, nowIso(), sender.id);
  await run(env, 'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?',
    rAfter, nowIso(), recipientWallet.id);
  const ref = transactionRef();
  await run(env,
    `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after,
       reference, status, payment_method, description, created_at)
     VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, 'COMPLETED', 'WALLET', ?, ?)`,
    uuid(), sender.id, -amount, sBefore, sAfter, ref,
    `Transfer to ${recipient.phone_number}`, nowIso(),
  );
  await run(env,
    `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after,
       reference, status, payment_method, description, created_at)
     VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, 'COMPLETED', 'WALLET', ?, ?)`,
    uuid(), recipientWallet.id, amount, rBefore, rAfter, ref,
    `Transfer from ${currentUser.phone_number}`, nowIso(),
  );
  return json({ reference: ref, new_balance: sAfter });
}
