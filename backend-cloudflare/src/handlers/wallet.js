// Wallet handlers — every money-touching path is atomic (D1 batch) and
// honors an Idempotency-Key (header or body) so a retry can't double-debit.

import { json, readBody, error } from '../lib/http.js';
import { one, all, run, batch, nowIso } from '../lib/db.js';
import { uuid, transactionRef } from '../lib/ids.js';
import { getIdempotencyKey } from '../lib/idempotency.js';
import { audit } from '../lib/audit.js';

async function ensureWallet(env, userId) {
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
  } else {
    // Reset spent counters at day / month boundaries. We track the last reset
    // via the columns last_daily_reset / last_monthly_reset where present.
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    let needDaily = false, needMonthly = false;
    if (w.last_daily_reset !== undefined) {
      if (!w.last_daily_reset || String(w.last_daily_reset).slice(0, 10) !== today) needDaily = true;
    } else if (Number(w.daily_spent || 0) > 0) {
      // No tracking column — fall back to "always reset on a new wallet read"
      needDaily = false;
    }
    if (w.last_monthly_reset !== undefined) {
      if (!w.last_monthly_reset || String(w.last_monthly_reset).slice(0, 7) !== month) needMonthly = true;
    }
    if (needDaily || needMonthly) {
      const sets = [];
      const binds = [];
      if (needDaily) {
        sets.push('daily_spent = 0');
        if (w.last_daily_reset !== undefined) { sets.push('last_daily_reset = ?'); binds.push(nowIso()); }
      }
      if (needMonthly) {
        sets.push('monthly_spent = 0');
        if (w.last_monthly_reset !== undefined) { sets.push('last_monthly_reset = ?'); binds.push(nowIso()); }
      }
      if (sets.length) {
        binds.push(w.id);
        await run(env, `UPDATE wallets SET ${sets.join(', ')} WHERE id = ?`, ...binds);
        w = await one(env, 'SELECT * FROM wallets WHERE id = ?', w.id);
      }
    }
  }
  return w;
}

/** Ensure a debit wouldn't exceed the wallet's daily/monthly spend limits. */
function checkLimits(wallet, amount) {
  const dailySpent = Number(wallet.daily_spent || 0) + amount;
  const monthlySpent = Number(wallet.monthly_spent || 0) + amount;
  if (Number(wallet.daily_limit) > 0 && dailySpent > Number(wallet.daily_limit)) {
    return `Daily spend limit exceeded (R${Number(wallet.daily_limit).toFixed(2)})`;
  }
  if (Number(wallet.monthly_limit) > 0 && monthlySpent > Number(wallet.monthly_limit)) {
    return `Monthly spend limit exceeded (R${Number(wallet.monthly_limit).toFixed(2)})`;
  }
  return null;
}

export async function getWallet(_request, env, currentUser) {
  return json(await ensureWallet(env, currentUser.id));
}

export async function listTransactions(request, env, currentUser) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, parseInt(url.searchParams.get('page_size') || url.searchParams.get('limit') || '20', 10));
  const offset = (page - 1) * pageSize;
  const w = await ensureWallet(env, currentUser.id);
  const txs = await all(
    env,
    'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    w.id, pageSize, offset,
  );
  const totalRow = await one(env, 'SELECT COUNT(*) AS c FROM transactions WHERE wallet_id = ?', w.id);
  return json({
    transactions: txs,
    total: Number(totalRow?.c || 0),
    page,
    has_more: offset + txs.length < Number(totalRow?.c || 0),
  });
}

// ---------- Topup ----------

export async function topup(request, env, currentUser) {
  const body = await readBody(request);
  const idempotencyKey = getIdempotencyKey(request, body);

  const amount = Number(body.amount);
  if (!(amount > 0)) return error('amount must be > 0');

  // Idempotency via the transactions.idempotency_key UNIQUE column
  if (idempotencyKey) {
    const seen = await one(env, 'SELECT * FROM transactions WHERE idempotency_key = ?', idempotencyKey);
    if (seen) {
      return json({ new_balance: Number(seen.balance_after), reference: seen.reference, replayed: true });
    }
  }

  const w = await ensureWallet(env, currentUser.id);
  const before = Number(w.balance);
  const after = before + amount;
  const txId = uuid();
  const ref = transactionRef();

  await batch(env, [
    {
      sql: 'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ? AND balance = ?',
      binds: [amount, nowIso(), w.id, before],
    },
    {
      sql: `INSERT INTO transactions (id, wallet_id, type, amount, fee, balance_before, balance_after,
              reference, status, payment_method, description, idempotency_key, created_at)
            VALUES (?, ?, 'TOPUP', ?, 0, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)`,
      binds: [
        txId, w.id, amount, before, after, ref,
        body.payment_method || 'CARD',
        body.description || 'Wallet top-up',
        idempotencyKey,
        nowIso(),
      ],
    },
  ]);

  // Verify the optimistic update actually applied (concurrent write would have changed balance)
  const updated = await one(env, 'SELECT balance FROM wallets WHERE id = ?', w.id);
  if (Number(updated.balance) !== after) {
    return error('Concurrent update detected, please retry', 409);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'wallet.topup',
    entity_type: 'wallet', entity_id: w.id,
    new: { amount, balance_after: after, reference: ref },
  });

  return json({ new_balance: after, reference: ref, transaction_id: txId });
}

// ---------- Transfer ----------

export async function transfer(request, env, currentUser) {
  const body = await readBody(request);
  const idempotencyKey = getIdempotencyKey(request, body);

  const amount = Number(body.amount);
  if (!(amount > 0)) return error('amount must be > 0');
  const phone = String(body.recipient_phone || '').replace(/[^\d+]/g, '');
  if (!phone) return error('recipient_phone required');

  const recipient = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  if (!recipient) return error('Recipient not found');
  if (recipient.id === currentUser.id) return error('Cannot transfer to yourself');

  if (idempotencyKey) {
    const seen = await one(env, 'SELECT * FROM transactions WHERE idempotency_key = ?', idempotencyKey);
    if (seen) {
      return json({ reference: seen.reference, new_balance: Number(seen.balance_after), replayed: true });
    }
  }

  const sender = await ensureWallet(env, currentUser.id);
  const recipientWallet = await ensureWallet(env, recipient.id);

  const limitErr = checkLimits(sender, amount);
  if (limitErr) return error(limitErr, 403);

  const sBefore = Number(sender.balance);
  if (sBefore < amount) return error('Insufficient balance');

  const sAfter = sBefore - amount;
  const rBefore = Number(recipientWallet.balance);
  const rAfter = rBefore + amount;
  const ref = transactionRef();

  await batch(env, [
    // Debit sender — guarded by current balance to detect concurrent updates.
    {
      sql: 'UPDATE wallets SET balance = balance - ?, daily_spent = daily_spent + ?, updated_at = ? WHERE id = ? AND balance >= ?',
      binds: [amount, amount, nowIso(), sender.id, amount],
    },
    {
      sql: 'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
      binds: [amount, nowIso(), recipientWallet.id],
    },
    {
      sql: `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, idempotency_key, created_at)
            VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, 'COMPLETED', 'WALLET', ?, ?, ?)`,
      binds: [uuid(), sender.id, -amount, sBefore, sAfter, ref,
              `Transfer to ${recipient.phone_number}`, idempotencyKey, nowIso()],
    },
    {
      sql: `INSERT INTO transactions (id, wallet_id, type, amount, balance_before, balance_after,
              reference, status, payment_method, description, created_at)
            VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, 'COMPLETED', 'WALLET', ?, ?)`,
      binds: [uuid(), recipientWallet.id, amount, rBefore, rAfter, ref,
              `Transfer from ${currentUser.phone_number}`, nowIso()],
    },
  ]);

  // Defensive: verify sender balance landed where we expect.
  const updated = await one(env, 'SELECT balance FROM wallets WHERE id = ?', sender.id);
  if (Number(updated.balance) !== sAfter) {
    return error('Concurrent update detected, please retry', 409);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'wallet.transfer',
    entity_type: 'wallet', entity_id: sender.id,
    new: { recipient_user_id: recipient.id, amount, reference: ref },
  });

  return json({ reference: ref, new_balance: sAfter, transaction_id: 'completed' });
}
