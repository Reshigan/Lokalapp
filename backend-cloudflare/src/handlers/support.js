import { json, readBody, error } from '../lib/http.js';
import { all, one, run, nowIso } from '../lib/db.js';
import { uuid } from '../lib/ids.js';
import { notify } from '../lib/notify.js';
import { audit } from '../lib/audit.js';
import { getRoles } from '../lib/auth.js';

const VALID_CATEGORIES = ['BILLING', 'METER', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'OTHER'];
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];

function ticketRef() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const r = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => (b % 10).toString()).join('');
  const s = Array.from(crypto.getRandomValues(new Uint8Array(2))).map((b) => (b % 10).toString()).join('');
  return `TIC-${y}${m}${day}-${r}${s}`;
}

async function ticketWithRefs(env, t, opener, assignee) {
  return {
    id: t.id,
    reference_number: t.reference_number,
    opened_by: opener ? { id: opener.id, name: [opener.first_name, opener.last_name].filter(Boolean).join(' ') || opener.phone_number } : null,
    category: t.category,
    priority: t.priority,
    subject: t.subject,
    description: t.description,
    status: t.status,
    related_entity_type: t.related_entity_type,
    related_entity_id: t.related_entity_id,
    assigned_to: assignee ? { id: assignee.id, name: [assignee.first_name, assignee.last_name].filter(Boolean).join(' ') || assignee.phone_number } : null,
    resolved_at: t.resolved_at,
    closed_at: t.closed_at,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

// ---------- Create ticket (any user) ----------

export async function createTicket(request, env, currentUser) {
  const body = await readBody(request);
  if (!body.subject || !body.description || !body.category) {
    return error('subject, description and category required');
  }
  if (!VALID_CATEGORIES.includes(body.category)) {
    return error(`category must be one of ${VALID_CATEGORIES.join(', ')}`);
  }
  const priority = body.priority || 'NORMAL';
  if (!VALID_PRIORITIES.includes(priority)) return error('Invalid priority');

  const id = uuid();
  const ref = ticketRef();
  await run(
    env,
    `INSERT INTO support_tickets (id, reference_number, opened_by_user_id, category, priority,
       subject, description, status, related_entity_type, related_entity_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?)`,
    id, ref, currentUser.id, body.category, priority,
    body.subject, body.description,
    body.related_entity_type || null, body.related_entity_id || null,
    nowIso(), nowIso(),
  );

  // Notify all SUPPORT/ADMIN users
  const supportUsers = await all(
    env,
    `SELECT DISTINCT user_id FROM user_roles WHERE role IN ('SUPPORT','ADMIN') AND revoked_at IS NULL`,
  );
  for (const u of supportUsers) {
    await notify(env, u.user_id, {
      title: `New ticket ${ref}`,
      body: `[${body.category}] ${body.subject}`,
      category: 'GENERIC',
      data: { ticket_id: id },
    });
  }

  const t = await one(env, 'SELECT * FROM support_tickets WHERE id = ?', id);
  return json(await ticketWithRefs(env, t, currentUser, null), 201);
}

// ---------- List ----------

export async function listTickets(request, env, currentUser) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const mineOnly = url.searchParams.get('mine_only') === 'true';
  const assignedToMe = url.searchParams.get('assigned_to_me') === 'true';

  const roles = await getRoles(env, currentUser.id);
  const isStaff = roles.includes('SUPPORT') || roles.includes('ADMIN');

  let sql = 'SELECT * FROM support_tickets WHERE 1=1';
  const binds = [];
  if (mineOnly || !isStaff) {
    sql += ' AND opened_by_user_id = ?';
    binds.push(currentUser.id);
  }
  if (assignedToMe) {
    sql += ' AND assigned_to_user_id = ?';
    binds.push(currentUser.id);
  }
  if (status) {
    sql += ' AND status = ?';
    binds.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const rows = await all(env, sql, ...binds);

  // Bulk fetch users
  const ids = new Set();
  for (const r of rows) {
    ids.add(r.opened_by_user_id);
    if (r.assigned_to_user_id) ids.add(r.assigned_to_user_id);
  }
  const idArr = [...ids];
  const users = idArr.length
    ? await all(env, `SELECT * FROM users WHERE id IN (${idArr.map(() => '?').join(',')})`, ...idArr)
    : [];
  const map = Object.fromEntries(users.map((u) => [u.id, u]));
  const out = [];
  for (const r of rows) {
    out.push(await ticketWithRefs(env, r, map[r.opened_by_user_id], map[r.assigned_to_user_id]));
  }
  return json(out);
}

// ---------- Get + messages ----------

export async function getTicket(_request, env, currentUser, _deps, params) {
  const t = await one(env, 'SELECT * FROM support_tickets WHERE id = ?', params.id);
  if (!t) return error('Ticket not found', 404);
  const roles = await getRoles(env, currentUser.id);
  const isStaff = roles.includes('SUPPORT') || roles.includes('ADMIN');
  if (!isStaff && t.opened_by_user_id !== currentUser.id) {
    return error('Not authorized', 403);
  }

  const opener = await one(env, 'SELECT * FROM users WHERE id = ?', t.opened_by_user_id);
  const assignee = t.assigned_to_user_id ? await one(env, 'SELECT * FROM users WHERE id = ?', t.assigned_to_user_id) : null;
  const messages = await all(
    env,
    `SELECT * FROM support_messages WHERE ticket_id = ? ${isStaff ? '' : 'AND is_internal = 0'} ORDER BY created_at`,
    t.id,
  );

  // Author lookups
  const authorIds = [...new Set(messages.map((m) => m.author_user_id))];
  const authors = authorIds.length
    ? await all(env, `SELECT id, first_name, last_name, phone_number FROM users WHERE id IN (${authorIds.map(() => '?').join(',')})`, ...authorIds)
    : [];
  const authorMap = Object.fromEntries(authors.map((u) => [u.id, u]));

  return json({
    ticket: await ticketWithRefs(env, t, opener, assignee),
    messages: messages.map((m) => ({
      id: m.id,
      author: authorMap[m.author_user_id] ? {
        id: m.author_user_id,
        name: [authorMap[m.author_user_id].first_name, authorMap[m.author_user_id].last_name].filter(Boolean).join(' ') || authorMap[m.author_user_id].phone_number,
      } : null,
      body: m.body,
      attachment_url: m.attachment_url,
      is_internal: m.is_internal === 1,
      created_at: m.created_at,
    })),
  });
}

// ---------- Reply ----------

export async function replyTicket(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  if (!body.body) return error('body required');
  const t = await one(env, 'SELECT * FROM support_tickets WHERE id = ?', params.id);
  if (!t) return error('Ticket not found', 404);

  const roles = await getRoles(env, currentUser.id);
  const isStaff = roles.includes('SUPPORT') || roles.includes('ADMIN');
  if (!isStaff && t.opened_by_user_id !== currentUser.id) {
    return error('Not authorized', 403);
  }

  const id = uuid();
  const isInternal = !!body.is_internal && isStaff;
  await run(
    env,
    `INSERT INTO support_messages (id, ticket_id, author_user_id, body, attachment_url, is_internal, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id, t.id, currentUser.id, body.body, body.attachment_url || null,
    isInternal ? 1 : 0, nowIso(),
  );
  await run(env, 'UPDATE support_tickets SET updated_at = ? WHERE id = ?', nowIso(), t.id);

  // Notify the other party
  if (!isInternal) {
    const recipientId = isStaff
      ? t.opened_by_user_id
      : (t.assigned_to_user_id || null);
    if (recipientId) {
      await notify(env, recipientId, {
        title: `Reply on ${t.reference_number}`,
        body: body.body.slice(0, 200),
        category: 'GENERIC',
        data: { ticket_id: t.id },
      });
    }
  }

  return json({ id, ticket_id: t.id, body: body.body, is_internal: isInternal, created_at: nowIso() }, 201);
}

// ---------- Status / assignment (staff only) ----------

export async function updateTicketStatus(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  if (!VALID_STATUSES.includes(body.status)) {
    return error(`status must be one of ${VALID_STATUSES.join(', ')}`);
  }
  const sets = ['status = ?'];
  const binds = [body.status];
  if (body.status === 'RESOLVED') {
    sets.push('resolved_at = ?'); binds.push(nowIso());
  }
  if (body.status === 'CLOSED') {
    sets.push('closed_at = ?'); binds.push(nowIso());
  }
  sets.push('updated_at = ?'); binds.push(nowIso());
  binds.push(params.id);
  const r = await run(env, `UPDATE support_tickets SET ${sets.join(', ')} WHERE id = ?`, ...binds);
  if (!r.success) return error('Ticket not found', 404);

  const t = await one(env, 'SELECT * FROM support_tickets WHERE id = ?', params.id);
  if (t.opened_by_user_id) {
    await notify(env, t.opened_by_user_id, {
      title: `Ticket ${t.reference_number} ${body.status.toLowerCase()}`,
      body: t.subject,
      category: 'GENERIC',
      data: { ticket_id: t.id },
    });
  }
  return json({ id: t.id, status: t.status });
}

export async function assignTicket(request, env, _user, _deps, params) {
  const body = await readBody(request);
  if (!body.assignee_user_id) return error('assignee_user_id required');
  const u = await one(env, 'SELECT id FROM users WHERE id = ?', body.assignee_user_id);
  if (!u) return error('Assignee not found', 404);
  const r = await run(
    env,
    'UPDATE support_tickets SET assigned_to_user_id = ?, status = COALESCE(NULLIF(status, \'OPEN\'), \'IN_PROGRESS\'), updated_at = ? WHERE id = ?',
    body.assignee_user_id, nowIso(), params.id,
  );
  if (!r.success) return error('Ticket not found', 404);
  await notify(env, body.assignee_user_id, {
    title: `Ticket assigned to you`,
    body: 'Open the support inbox to view it.',
    category: 'GENERIC',
    data: { ticket_id: params.id },
  });
  return json({ ok: true });
}

// ---------- RBAC role admin (admin only) ----------

const VALID_ROLES = ['AGENT', 'OFFICE_MANAGER', 'SUPPORT', 'ADMIN'];

export async function listRoles(_request, env) {
  const rows = await all(
    env,
    `SELECT ur.id, ur.user_id, ur.role, ur.granted_at, u.phone_number, u.first_name, u.last_name
     FROM user_roles ur JOIN users u ON u.id = ur.user_id
     WHERE ur.revoked_at IS NULL ORDER BY ur.granted_at DESC`,
  );
  return json(rows);
}

export async function grantRole(request, env, currentUser) {
  const body = await readBody(request);
  if (!body.user_id || !body.role) return error('user_id and role required');
  if (!VALID_ROLES.includes(body.role)) return error(`role must be one of ${VALID_ROLES.join(', ')}`);

  const u = await one(env, 'SELECT id FROM users WHERE id = ?', body.user_id);
  if (!u) return error('User not found', 404);

  const existing = await one(
    env,
    'SELECT id FROM user_roles WHERE user_id = ? AND role = ? AND revoked_at IS NULL',
    body.user_id, body.role,
  );
  if (existing) return json({ id: existing.id, ok: true });

  const id = uuid();
  await run(
    env,
    `INSERT INTO user_roles (id, user_id, role, granted_by_user_id, granted_at)
     VALUES (?, ?, ?, ?, ?)`,
    id, body.user_id, body.role, currentUser.id, nowIso(),
  );

  if (body.role === 'ADMIN') {
    await run(env, 'UPDATE users SET is_admin = 1 WHERE id = ?', body.user_id);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'role.grant',
    entity_type: 'user', entity_id: body.user_id,
    new: { role: body.role },
  });

  return json({ id, ok: true }, 201);
}

export async function revokeRole(request, env, currentUser) {
  const body = await readBody(request);
  if (!body.user_id || !body.role) return error('user_id and role required');
  await run(
    env,
    `UPDATE user_roles SET revoked_at = ? WHERE user_id = ? AND role = ? AND revoked_at IS NULL`,
    nowIso(), body.user_id, body.role,
  );
  if (body.role === 'ADMIN') {
    await run(env, 'UPDATE users SET is_admin = 0 WHERE id = ?', body.user_id);
  }
  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'role.revoke',
    entity_type: 'user', entity_id: body.user_id,
    old: { role: body.role },
  });
  return json({ ok: true });
}
