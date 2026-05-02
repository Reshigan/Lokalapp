// Simple sliding-window-ish rate limiter backed by D1.
//
// Usage:
//   const r = await checkRateLimit(env, 'otp_request', phone, { max: 5, windowSec: 3600 });
//   if (!r.ok) return error(`Too many requests. Try again in ${r.retryAfter}s`, 429);

import { one, run, nowIso } from './db.js';

/**
 * @param {string} scope - logical bucket name
 * @param {string} key - the identifier (phone, ip, user id…)
 * @param {{ max: number, windowSec: number }} opts
 * @returns {{ ok: boolean, retryAfter?: number, remaining?: number }}
 */
export async function checkRateLimit(env, scope, key, opts) {
  const { max, windowSec } = opts;
  const now = Date.now();
  const windowStartMs = now - windowSec * 1000;
  const windowStartIso = new Date(windowStartMs).toISOString();

  const row = await one(env, 'SELECT count, window_start FROM rate_limits_v2 WHERE scope = ? AND key = ?', scope, key);

  if (!row) {
    await run(
      env,
      `INSERT INTO rate_limits_v2 (scope, key, count, window_start) VALUES (?, ?, 1, ?)`,
      scope, key, nowIso(),
    );
    return { ok: true, remaining: max - 1 };
  }

  const startedAt = new Date(row.window_start).getTime();
  if (startedAt < windowStartMs) {
    // Window expired — reset
    await run(env, 'UPDATE rate_limits_v2 SET count = 1, window_start = ? WHERE scope = ? AND key = ?',
      nowIso(), scope, key);
    return { ok: true, remaining: max - 1 };
  }

  if (row.count >= max) {
    const retryAfter = Math.ceil((startedAt + windowSec * 1000 - now) / 1000);
    return { ok: false, retryAfter, remaining: 0 };
  }

  await run(env, 'UPDATE rate_limits_v2 SET count = count + 1 WHERE scope = ? AND key = ?', scope, key);
  return { ok: true, remaining: max - row.count - 1 };
}
