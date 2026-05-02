// Idempotency: short-circuit a duplicate POST when the client supplies an
// Idempotency-Key (header) or `idempotency_key` body field.
//
// We piggy-back on transactions.idempotency_key (already UNIQUE) for purchase
// flows, and on a small idempotency_keys table for everything else.
//
// Usage:
//   const dup = await checkIdempotency(env, key);
//   if (dup) return json(JSON.parse(dup), 200);
//   ... do work ...
//   await recordIdempotency(env, key, JSON.stringify(response));

import { one, run, nowIso } from './db.js';

export function getIdempotencyKey(request, body) {
  return (
    request.headers.get('Idempotency-Key') ||
    request.headers.get('X-Idempotency-Key') ||
    body?.idempotency_key ||
    null
  );
}

/** If we've seen this key before, return the cached response payload (string). */
export async function checkIdempotency(env, scope, key) {
  if (!key) return null;
  const row = await one(
    env,
    'SELECT response FROM idempotency_keys WHERE scope = ? AND key = ?',
    scope, key,
  );
  return row ? row.response : null;
}

/** Record a key + response so subsequent retries return the same payload. */
export async function recordIdempotency(env, scope, key, response) {
  if (!key) return;
  try {
    await run(
      env,
      `INSERT INTO idempotency_keys (scope, key, response, created_at)
       VALUES (?, ?, ?, ?)`,
      scope, key, response, nowIso(),
    );
  } catch {
    // Table may not exist on a partially-migrated DB. We treat absence as
    // "no idempotency available" rather than failing the request.
  }
}
