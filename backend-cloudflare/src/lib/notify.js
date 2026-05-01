// Notification dispatch: store in notification_logs and best-effort send Web Push.

import { all, run, nowIso } from './db.js';
import { uuid } from './ids.js';
import { sendPush, isPushConfigured } from './push.js';

export async function notify(env, userId, { title, body, category = 'GENERIC', data = null }) {
  let delivered = 0;
  if (isPushConfigured(env)) {
    const subs = await all(
      env,
      'SELECT * FROM push_subscriptions WHERE user_id = ? AND is_active = 1',
      userId,
    );
    for (const sub of subs) {
      const r = await sendPush(env, sub, { title, body, category, data: data || {} });
      if (r.ok) {
        delivered = 1;
        await run(
          env,
          'UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?',
          nowIso(), sub.id,
        );
      } else if (r.reason === 'gone') {
        await run(env, 'UPDATE push_subscriptions SET is_active = 0 WHERE id = ?', sub.id);
      }
    }
  }
  await run(
    env,
    `INSERT INTO notification_logs
     (id, user_id, category, title, body, data, push_delivered, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    uuid(), userId, category, title, body,
    data ? JSON.stringify(data) : null,
    delivered, nowIso(),
  );
}
