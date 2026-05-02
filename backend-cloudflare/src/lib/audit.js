// Audit log helper. Writes are best-effort — never fail a request because
// audit log couldn't be written, but log it so we know.

import { run, nowIso } from './db.js';
import { uuid } from './ids.js';

/**
 * Record an audit event. Schema columns: id, user_id, action, entity_type,
 * entity_id, old_value, new_value, ip_address, user_agent, created_at.
 *
 * @param {{ actor_user_id?, action, entity_type, entity_id?, old?, new?, ip?, user_agent? }} entry
 */
export async function audit(env, request, entry) {
  try {
    await run(
      env,
      `INSERT INTO audit_logs
       (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(),
      entry.actor_user_id || null,
      entry.action,
      entry.entity_type || 'system',
      entry.entity_id || null,
      entry.old !== undefined ? JSON.stringify(entry.old) : null,
      entry.new !== undefined ? JSON.stringify(entry.new) : null,
      request?.headers?.get?.('CF-Connecting-IP') || null,
      request?.headers?.get?.('User-Agent') || null,
      nowIso(),
    );
  } catch (e) {
    console.error('audit insert failed', e?.message || e);
  }
}
