import { json, readBody, error, noContent } from '../lib/http.js';
import { all, one, run, batch, nowIso } from '../lib/db.js';
import { uuid } from '../lib/ids.js';

async function loadTariff(env, id) {
  const t = await one(env, 'SELECT * FROM tariff_plans WHERE id = ?', id);
  if (!t) return null;
  const blocks = await all(env, 'SELECT * FROM tariff_blocks WHERE tariff_id = ? ORDER BY sort_order', id);
  const bands = await all(env, 'SELECT * FROM tariff_time_bands WHERE tariff_id = ? ORDER BY sort_order', id);
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    type: t.type,
    billing_period: t.billing_period,
    flat_rate_per_kwh: t.flat_rate_per_kwh != null ? Number(t.flat_rate_per_kwh) : null,
    service_fee: Number(t.service_fee || 0),
    is_active: t.is_active,
    blocks: blocks.map((b) => ({
      id: b.id,
      from_kwh: Number(b.from_kwh),
      to_kwh: b.to_kwh != null ? Number(b.to_kwh) : null,
      rate_per_kwh: Number(b.rate_per_kwh),
      sort_order: b.sort_order,
    })),
    time_bands: bands.map((b) => ({
      id: b.id,
      name: b.name,
      start_hour: b.start_hour,
      end_hour: b.end_hour,
      rate_per_kwh: Number(b.rate_per_kwh),
      sort_order: b.sort_order,
    })),
  };
}

export async function listTariffs(_request, env) {
  const ts = await all(env, 'SELECT id FROM tariff_plans WHERE is_active = 1 ORDER BY created_at DESC');
  const out = [];
  for (const r of ts) out.push(await loadTariff(env, r.id));
  return json(out);
}

export async function getTariff(_request, env, _user, _deps, params) {
  const t = await loadTariff(env, params.id);
  if (!t) return error('Tariff not found', 404);
  return json(t);
}

export async function createTariff(request, env) {
  const body = await readBody(request);
  if (!body.name || !body.type) return error('name and type required');
  if (body.type === 'FLAT' && body.flat_rate_per_kwh == null) {
    return error('flat_rate_per_kwh required for FLAT');
  }
  if (body.type === 'UNITS_BLOCK' && !(body.blocks || []).length) {
    return error('blocks required for UNITS_BLOCK');
  }
  if (body.type === 'TIME_OF_USE' && !(body.time_bands || []).length) {
    return error('time_bands required for TIME_OF_USE');
  }

  const id = uuid();
  const stmts = [{
    sql: `INSERT INTO tariff_plans (id, name, description, type, billing_period,
            flat_rate_per_kwh, service_fee, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    binds: [
      id, String(body.name), body.description || null,
      body.type, body.billing_period || 'MONTHLY',
      body.flat_rate_per_kwh ?? null,
      Number(body.service_fee || 0),
      nowIso(), nowIso(),
    ],
  }];
  for (const b of body.blocks || []) {
    stmts.push({
      sql: `INSERT INTO tariff_blocks (id, tariff_id, from_kwh, to_kwh, rate_per_kwh, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)`,
      binds: [uuid(), id, Number(b.from_kwh), b.to_kwh != null ? Number(b.to_kwh) : null, Number(b.rate_per_kwh), Number(b.sort_order || 0)],
    });
  }
  for (const b of body.time_bands || []) {
    stmts.push({
      sql: `INSERT INTO tariff_time_bands (id, tariff_id, name, start_hour, end_hour, rate_per_kwh, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      binds: [uuid(), id, String(b.name).toUpperCase(), Number(b.start_hour), Number(b.end_hour), Number(b.rate_per_kwh), Number(b.sort_order || 0)],
    });
  }
  await batch(env, stmts);
  return json(await loadTariff(env, id), 201);
}

export async function deactivateTariff(_request, env, _user, _deps, params) {
  const r = await run(env, 'UPDATE tariff_plans SET is_active = 0, updated_at = ? WHERE id = ?', nowIso(), params.id);
  if (!r.success) return error('Tariff not found', 404);
  return noContent();
}
