import { json, readBody, noContent, error } from '../lib/http.js';
import { all, one, run, nowIso } from '../lib/db.js';
import { uuid } from '../lib/ids.js';
import { notify } from '../lib/notify.js';

export async function vapidPublicKey(_request, env) {
  return json({ public_key: env.VAPID_PUBLIC_KEY || '' });
}

export async function subscribe(request, env, currentUser) {
  const body = await readBody(request);
  if (!body.endpoint || !body.p256dh || !body.auth) {
    return error('endpoint, p256dh and auth required');
  }
  const existing = await one(env, 'SELECT id FROM push_subscriptions WHERE endpoint = ?', body.endpoint);
  if (existing) {
    await run(
      env,
      `UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ?, user_agent = ?, is_active = 1
       WHERE id = ?`,
      currentUser.id, body.p256dh, body.auth, body.user_agent || null, existing.id,
    );
    const updated = await one(env, 'SELECT * FROM push_subscriptions WHERE id = ?', existing.id);
    return json(updated, 201);
  }
  const id = uuid();
  await run(
    env,
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    id, currentUser.id, body.endpoint, body.p256dh, body.auth, body.user_agent || null, nowIso(),
  );
  return json(await one(env, 'SELECT * FROM push_subscriptions WHERE id = ?', id), 201);
}

export async function unsubscribe(request, env, currentUser) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');
  if (!endpoint) return error('endpoint required');
  await run(
    env,
    'UPDATE push_subscriptions SET is_active = 0 WHERE endpoint = ? AND user_id = ?',
    endpoint, currentUser.id,
  );
  return noContent();
}

export async function listNotifications(request, env, currentUser) {
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread_only') === 'true';
  let sql = 'SELECT * FROM notification_logs WHERE user_id = ?';
  const binds = [currentUser.id];
  if (unreadOnly) sql += ' AND is_read = 0';
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const rows = await all(env, sql, ...binds);
  return json(rows.map((r) => ({ ...r, is_read: r.is_read === 1 })));
}

export async function markRead(_request, env, currentUser, _deps, params) {
  const r = await run(
    env,
    'UPDATE notification_logs SET is_read = 1 WHERE id = ? AND user_id = ?',
    params.id, currentUser.id,
  );
  if (!r.success) return error('Notification not found', 404);
  return noContent();
}

export async function sendTest(request, env, currentUser) {
  const body = await readBody(request);
  await notify(env, currentUser.id, {
    title: body.title || 'Test notification',
    body: body.body || 'Hello from Lokal',
    category: 'GENERIC',
  });
  const latest = await one(
    env,
    'SELECT * FROM notification_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    currentUser.id,
  );
  return json({ ...latest, is_read: latest.is_read === 1 });
}
