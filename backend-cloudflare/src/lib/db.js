// Thin D1 helpers used everywhere.

export async function one(env, sql, ...binds) {
  return await env.DB.prepare(sql).bind(...binds).first();
}

export async function all(env, sql, ...binds) {
  const r = await env.DB.prepare(sql).bind(...binds).all();
  return r.results || [];
}

export async function run(env, sql, ...binds) {
  return await env.DB.prepare(sql).bind(...binds).run();
}

export async function batch(env, statements) {
  // statements: Array<{ sql, binds }>
  const prepared = statements.map((s) => env.DB.prepare(s.sql).bind(...(s.binds || [])));
  return await env.DB.batch(prepared);
}

export function nowIso() {
  return new Date().toISOString();
}
