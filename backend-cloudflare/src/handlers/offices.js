import { json, readBody, error } from '../lib/http.js';
import { all, one, run, nowIso } from '../lib/db.js';
import { uuid } from '../lib/ids.js';

export async function listOffices(_request, env) {
  const rows = await all(env, 'SELECT * FROM community_offices WHERE is_active = 1 ORDER BY name');
  return json(rows);
}

export async function createOffice(request, env) {
  const body = await readBody(request);
  if (!body.name || !body.code) return error('name and code required');
  const dup = await one(env, 'SELECT id FROM community_offices WHERE code = ?', body.code);
  if (dup) return error('Office code already exists');
  const id = uuid();
  await run(
    env,
    `INSERT INTO community_offices (id, name, code, address, contact_phone, manager_user_id,
     location_lat, location_lng, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    id, body.name, body.code, body.address || null, body.contact_phone || null,
    body.manager_user_id || null, body.location_lat || null, body.location_lng || null,
    nowIso(), nowIso(),
  );
  // If a manager is set, grant them the OFFICE_MANAGER role
  if (body.manager_user_id) {
    const existing = await one(
      env,
      'SELECT id FROM user_roles WHERE user_id = ? AND role = ? AND revoked_at IS NULL',
      body.manager_user_id, 'OFFICE_MANAGER',
    );
    if (!existing) {
      await run(
        env,
        `INSERT INTO user_roles (id, user_id, role, granted_by_user_id, granted_at)
         VALUES (?, ?, 'OFFICE_MANAGER', NULL, ?)`,
        uuid(), body.manager_user_id, nowIso(),
      );
    }
  }
  return json(await one(env, 'SELECT * FROM community_offices WHERE id = ?', id), 201);
}
