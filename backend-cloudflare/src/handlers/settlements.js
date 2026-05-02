import { json, readBody, error } from '../lib/http.js';
import { all, one, run, batch, nowIso } from '../lib/db.js';
import { uuid, settlementRef } from '../lib/ids.js';
import { notify } from '../lib/notify.js';
import { audit } from '../lib/audit.js';

function settlementPublic(s, office) {
  return {
    id: s.id,
    reference_number: s.reference_number,
    agent_id: s.agent_id,
    community_office_id: s.community_office_id,
    community_office_name: office?.name || null,
    declared_amount: Number(s.declared_amount),
    expected_amount: Number(s.expected_amount),
    confirmed_amount: s.confirmed_amount != null ? Number(s.confirmed_amount) : null,
    num_collections: s.num_collections,
    status: s.status,
    agent_confirmed_at: s.agent_confirmed_at,
    office_confirmed_at: s.office_confirmed_at,
    notes: s.notes,
    created_at: s.created_at,
  };
}

export async function submitSettlement(request, env, currentUser, deps) {
  const body = await readBody(request);
  if (!body.community_office_id || body.declared_amount == null) {
    return error('community_office_id and declared_amount required');
  }
  const office = await one(env, 'SELECT * FROM community_offices WHERE id = ? AND is_active = 1', body.community_office_id);
  if (!office) return error('Community office not found', 404);

  // Reject if there's already an open submission from this agent
  const open = await one(
    env,
    `SELECT id FROM agent_settlements WHERE agent_id = ? AND status = 'SUBMITTED'`,
    deps.agent.id,
  );
  if (open) return error('You already have an unconfirmed settlement', 409);

  const collections = await all(
    env,
    `SELECT id, amount FROM cash_collections
     WHERE agent_id = ? AND settled = 0 AND status = 'CONFIRMED' AND settlement_id IS NULL`,
    deps.agent.id,
  );
  if (!collections.length) return error('No unsettled cash collections to settle');

  const expected = Math.round(collections.reduce((s, c) => s + Number(c.amount), 0) * 100) / 100;
  const declared = Number(body.declared_amount);
  const settlementId = uuid();
  const ref = settlementRef();

  // Atomic: insert + link in a single batch.
  await batch(env, [
    {
      sql: `INSERT INTO agent_settlements (id, reference_number, agent_id, community_office_id,
              declared_amount, expected_amount, num_collections, status,
              agent_confirmed_at, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?)`,
      binds: [settlementId, ref, deps.agent.id, office.id,
              declared, expected, collections.length,
              nowIso(), body.notes || null, nowIso(), nowIso()],
    },
    ...collections.map((c) => ({
      sql: `UPDATE cash_collections SET settlement_id = ?
            WHERE id = ? AND agent_id = ? AND settled = 0 AND status = 'CONFIRMED' AND settlement_id IS NULL`,
      binds: [settlementId, c.id, deps.agent.id],
    })),
  ]);

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'settlement.submit',
    entity_type: 'settlement', entity_id: settlementId,
    new: { reference_number: ref, declared, expected, num_collections: collections.length },
  });

  if (office.manager_user_id) {
    await notify(env, office.manager_user_id, {
      title: `Settlement submitted`,
      body: `${deps.agent.business_name} declared R${declared.toFixed(2)} for ${collections.length} collections.`,
      category: 'SETTLEMENT_SUBMITTED',
      data: { settlement_id: settlementId },
    });
  }

  const created = await one(env, 'SELECT * FROM agent_settlements WHERE id = ?', settlementId);
  return json(settlementPublic(created, office), 201);
}

export async function confirmSettlement(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  const s = await one(env, 'SELECT * FROM agent_settlements WHERE id = ?', params.id);
  if (!s) return error('Settlement not found', 404);
  if (s.status !== 'SUBMITTED') return error(`Settlement is ${s.status}`);

  const office = await one(env, 'SELECT * FROM community_offices WHERE id = ?', s.community_office_id);
  const isManager = office.manager_user_id === currentUser.id;
  const isAdminLike = (currentUser.email || '').toLowerCase().includes('admin') || currentUser.is_admin;
  // Also allow a user with OFFICE_MANAGER or SUPPORT role
  const otherRole = await one(
    env,
    `SELECT id FROM user_roles WHERE user_id = ? AND role IN ('OFFICE_MANAGER','SUPPORT','ADMIN') AND revoked_at IS NULL`,
    currentUser.id,
  );
  if (!(isManager || isAdminLike || otherRole)) {
    return error('Only the office manager (or admin/support) can confirm', 403);
  }

  const confirmedAmount = Number(body.confirmed_amount);
  if (!(confirmedAmount >= 0)) return error('confirmed_amount must be >= 0');

  const matches = Math.abs(confirmedAmount - Number(s.declared_amount)) < 0.005
    && Math.abs(confirmedAmount - Number(s.expected_amount)) < 0.005;
  const newStatus = matches ? 'CONFIRMED' : 'DISPUTED';

  // Atomic: settlement update guarded by current SUBMITTED status, plus
  // (if matched) mark collections settled in the same batch.
  const stmts = [
    {
      sql: `UPDATE agent_settlements SET confirmed_amount = ?, office_confirmed_at = ?,
              office_confirmed_by_user_id = ?, status = ?, notes = COALESCE(notes, '') || ?,
              updated_at = ?
            WHERE id = ? AND status = 'SUBMITTED'`,
      binds: [confirmedAmount, nowIso(), currentUser.id, newStatus,
              body.notes ? `\n[office] ${body.notes}` : '', nowIso(), s.id],
    },
  ];
  if (matches) {
    stmts.push({
      sql: 'UPDATE cash_collections SET settled = 1 WHERE settlement_id = ?',
      binds: [s.id],
    });
  }
  await batch(env, stmts);

  // Verify the state transition actually happened (concurrent confirm)
  const verify = await one(env, 'SELECT status FROM agent_settlements WHERE id = ?', s.id);
  if (verify?.status !== newStatus) {
    return error('Concurrent update — settlement already changed, please retry', 409);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id,
    action: matches ? 'settlement.confirm' : 'settlement.dispute',
    entity_type: 'settlement', entity_id: s.id,
    new: { confirmed_amount: confirmedAmount, declared: Number(s.declared_amount), status: newStatus },
  });

  const agentRow = await one(env, 'SELECT user_id, business_name FROM agents WHERE id = ?', s.agent_id);
  if (agentRow?.user_id) {
    await notify(env, agentRow.user_id, {
      title: `Settlement ${newStatus.toLowerCase()}`,
      body: `Office confirmed R${confirmedAmount.toFixed(2)} for ${s.reference_number}.`,
      category: 'SETTLEMENT_CONFIRMED',
      data: { settlement_id: s.id },
    });
  }

  const updated = await one(env, 'SELECT * FROM agent_settlements WHERE id = ?', s.id);
  return json(settlementPublic(updated, office));
}

export async function listSettlements(request, env, currentUser) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const mineOnly = url.searchParams.get('mine_only') === 'true';
  let sql = 'SELECT * FROM agent_settlements WHERE 1=1';
  const binds = [];
  if (status) { sql += ' AND status = ?'; binds.push(status); }
  if (mineOnly) {
    const agent = await one(env, 'SELECT id FROM agents WHERE user_id = ?', currentUser.id);
    if (agent) {
      sql += ' AND agent_id = ?';
      binds.push(agent.id);
    } else {
      // fallback: only those at offices managed by this user
      const offices = await all(env, 'SELECT id FROM community_offices WHERE manager_user_id = ?', currentUser.id);
      if (!offices.length) return json([]);
      sql += ` AND community_office_id IN (${offices.map(() => '?').join(',')})`;
      binds.push(...offices.map((o) => o.id));
    }
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const rows = await all(env, sql, ...binds);
  if (!rows.length) return json([]);
  const officeIds = [...new Set(rows.map((r) => r.community_office_id))];
  const offices = await all(
    env,
    `SELECT * FROM community_offices WHERE id IN (${officeIds.map(() => '?').join(',')})`,
    ...officeIds,
  );
  const map = Object.fromEntries(offices.map((o) => [o.id, o]));
  return json(rows.map((s) => settlementPublic(s, map[s.community_office_id])));
}

export async function getSettlement(_request, env, _user, _deps, params) {
  const s = await one(env, 'SELECT * FROM agent_settlements WHERE id = ?', params.id);
  if (!s) return error('Settlement not found', 404);
  const office = await one(env, 'SELECT * FROM community_offices WHERE id = ?', s.community_office_id);
  return json(settlementPublic(s, office));
}
