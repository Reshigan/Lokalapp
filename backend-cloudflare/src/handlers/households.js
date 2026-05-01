import { json, readBody, error } from '../lib/http.js';
import { all, one, run, nowIso } from '../lib/db.js';
import { uuid, accountNumber } from '../lib/ids.js';

async function attachRefs(env, h) {
  if (!h) return null;
  const tariff = h.tariff_id ? await one(env, 'SELECT name FROM tariff_plans WHERE id = ?', h.tariff_id) : null;
  const meter = h.meter_id ? await one(env, 'SELECT meter_number FROM electricity_meters WHERE id = ?', h.meter_id) : null;
  return {
    ...h,
    opening_balance: Number(h.opening_balance || 0),
    current_balance: Number(h.current_balance || 0),
    last_reading_kwh: Number(h.last_reading_kwh || 0),
    tariff_name: tariff?.name || null,
    meter_number: meter?.meter_number || null,
  };
}

export async function listHouseholds(request, env, currentUser, deps) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const mineOnly = url.searchParams.get('mine_only') === 'true';
  let sql = 'SELECT * FROM households WHERE 1=1';
  const binds = [];
  if (q) {
    sql += ' AND (account_number LIKE ? OR primary_contact_name LIKE ? OR primary_contact_phone LIKE ?)';
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  if (mineOnly && deps?.agent) {
    sql += ' AND registered_by_agent_id = ?';
    binds.push(deps.agent.id);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const rows = await all(env, sql, ...binds);
  const out = [];
  for (const r of rows) out.push(await attachRefs(env, r));
  return json(out);
}

export async function myHouseholds(_request, env, currentUser) {
  const rows = await all(env, 'SELECT * FROM households WHERE user_id = ?', currentUser.id);
  const out = [];
  for (const r of rows) out.push(await attachRefs(env, r));
  return json(out);
}

export async function getHousehold(_request, env, _user, _deps, params) {
  const h = await one(env, 'SELECT * FROM households WHERE id = ?', params.id);
  if (!h) return error('Household not found', 404);
  return json(await attachRefs(env, h));
}

export async function createHousehold(request, env, _currentUser, deps) {
  const body = await readBody(request);
  if (!body.primary_contact_name || !body.primary_contact_phone || !body.tariff_id) {
    return error('primary_contact_name, primary_contact_phone and tariff_id are required');
  }
  const tariff = await one(env, 'SELECT id FROM tariff_plans WHERE id = ? AND is_active = 1', body.tariff_id);
  if (!tariff) return error('Tariff not found');

  let meterId = null;
  if (body.meter_number) {
    const existing = await one(env, 'SELECT * FROM electricity_meters WHERE meter_number = ?', body.meter_number);
    if (existing) {
      meterId = existing.id;
    } else {
      meterId = uuid();
      await run(
        env,
        `INSERT INTO electricity_meters (id, meter_number, address, status, kwh_balance, last_reading, created_at, updated_at)
         VALUES (?, ?, ?, 'ON', 0, 0, ?, ?)`,
        meterId, body.meter_number, body.street_address || null, nowIso(), nowIso(),
      );
    }
  }

  let userId = null;
  if (body.user_phone) {
    const u = await one(env, 'SELECT id FROM users WHERE phone_number = ?', body.user_phone);
    if (u) {
      userId = u.id;
      if (meterId) {
        await run(env, 'UPDATE electricity_meters SET user_id = ? WHERE id = ?', userId, meterId);
      }
    }
  }

  const id = uuid();
  const opening = Number(body.opening_balance || 0);
  await run(
    env,
    `INSERT INTO households (id, account_number, user_id, meter_id, tariff_id, community_office_id,
       registered_by_agent_id, primary_contact_name, primary_contact_phone, primary_contact_id_number,
       email, erf_number, street_address, suburb, city, province, postal_code,
       location_lat, location_lng, opening_balance, current_balance, last_reading_kwh, last_reading_at,
       status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 'ACTIVE', ?, ?, ?)`,
    id, accountNumber(), userId, meterId, body.tariff_id, body.community_office_id || null,
    deps.agent.id,
    body.primary_contact_name, body.primary_contact_phone, body.primary_contact_id_number || null,
    body.email || null,
    body.erf_number || null, body.street_address || null,
    body.suburb || null, body.city || null, body.province || null, body.postal_code || null,
    body.location_lat || null, body.location_lng || null,
    opening, opening,
    body.notes || null,
    nowIso(), nowIso(),
  );
  const created = await one(env, 'SELECT * FROM households WHERE id = ?', id);
  return json(await attachRefs(env, created), 201);
}

export async function updateHousehold(request, env, _user, _deps, params) {
  const body = await readBody(request);
  const fields = [
    'primary_contact_name', 'primary_contact_phone', 'primary_contact_id_number',
    'email', 'erf_number', 'street_address', 'suburb', 'city', 'province', 'postal_code',
    'tariff_id', 'community_office_id', 'status', 'notes',
  ];
  const sets = [];
  const binds = [];
  for (const f of fields) {
    if (f in body) { sets.push(`${f} = ?`); binds.push(body[f]); }
  }
  if (!sets.length) return error('No fields to update');
  sets.push('updated_at = ?');
  binds.push(nowIso());
  binds.push(params.id);
  const r = await run(env, `UPDATE households SET ${sets.join(', ')} WHERE id = ?`, ...binds);
  if (!r.success) return error('Household not found', 404);
  const h = await one(env, 'SELECT * FROM households WHERE id = ?', params.id);
  return json(await attachRefs(env, h));
}
