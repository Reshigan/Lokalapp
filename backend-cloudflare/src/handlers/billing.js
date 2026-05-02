import { json, html, readBody, error } from '../lib/http.js';
import { all, one, run, batch, nowIso } from '../lib/db.js';
import { uuid, invoiceNumber, receiptNumber, confirmCode } from '../lib/ids.js';
import { calculateCharge, periodWindow, addDays } from '../lib/billing.js';
import { notify } from '../lib/notify.js';
import { getIdempotencyKey, checkIdempotency, recordIdempotency } from '../lib/idempotency.js';
import { audit } from '../lib/audit.js';

function invoicePublic(inv, household) {
  return {
    id: inv.id,
    invoice_number: inv.invoice_number,
    household_id: inv.household_id,
    household_account_number: household?.account_number || null,
    household_contact_name: household?.primary_contact_name || null,
    period_start: inv.period_start,
    period_end: inv.period_end,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    previous_reading_kwh: Number(inv.previous_reading_kwh),
    current_reading_kwh: Number(inv.current_reading_kwh),
    kwh_consumed: Number(inv.kwh_consumed),
    energy_charge: Number(inv.energy_charge),
    service_fee: Number(inv.service_fee || 0),
    total_amount: Number(inv.total_amount),
    amount_paid: Number(inv.amount_paid || 0),
    status: inv.status,
    line_items: inv.breakdown ? JSON.parse(inv.breakdown) : [],
    notes: inv.notes,
    created_at: inv.created_at,
  };
}

export async function captureReading(request, env, currentUser, deps) {
  const body = await readBody(request);
  const idempotencyKey = getIdempotencyKey(request, body);

  if (!body.household_id || body.current_reading_kwh == null) {
    return error('household_id and current_reading_kwh required');
  }

  if (idempotencyKey) {
    const cached = await checkIdempotency(env, 'meter_reading', idempotencyKey);
    if (cached) return json(JSON.parse(cached), 200);
  }

  const household = await one(env, 'SELECT * FROM households WHERE id = ?', body.household_id);
  if (!household) return error('Household not found', 404);
  if (household.status !== 'ACTIVE') return error(`Household status is ${household.status}`);

  const tariff = await one(env, 'SELECT * FROM tariff_plans WHERE id = ?', household.tariff_id);
  if (!tariff) return error('Tariff not found');

  const blocks = await all(env, 'SELECT * FROM tariff_blocks WHERE tariff_id = ? ORDER BY sort_order', tariff.id);
  const bands = await all(env, 'SELECT * FROM tariff_time_bands WHERE tariff_id = ? ORDER BY sort_order', tariff.id);

  const prev = Number(household.last_reading_kwh || 0);
  const curr = Number(body.current_reading_kwh);
  if (curr < prev) return error(`Current reading ${curr} less than previous ${prev}`);
  const consumed = curr - prev;

  const readingId = uuid();

  // Reading-only path (no invoice)
  if (body.issue_invoice === false) {
    await batch(env, [
      {
        sql: `INSERT INTO meter_readings (id, household_id, meter_id, agent_id, previous_reading_kwh,
                current_reading_kwh, kwh_consumed, source, peak_kwh, standard_kwh, off_peak_kwh,
                photo_url, notes, captured_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'AGENT', ?, ?, ?, ?, ?, ?)`,
        binds: [readingId, household.id, household.meter_id, deps.agent.id,
                prev, curr, consumed,
                body.peak_kwh ?? null, body.standard_kwh ?? null, body.off_peak_kwh ?? null,
                body.photo_url || null, body.notes || null, nowIso()],
      },
      {
        sql: 'UPDATE households SET last_reading_kwh = ?, last_reading_at = ?, updated_at = ? WHERE id = ?',
        binds: [curr, nowIso(), nowIso(), household.id],
      },
    ]);
    const resp = { message: 'Reading captured (no invoice issued)', reading_id: readingId };
    await recordIdempotency(env, 'meter_reading', idempotencyKey, JSON.stringify(resp));
    return json(resp);
  }

  // Reading + invoice — atomic
  const { energyCharge, lineItems } = calculateCharge(tariff, blocks, bands, consumed, {
    peak_kwh: body.peak_kwh, standard_kwh: body.standard_kwh, off_peak_kwh: body.off_peak_kwh,
  });
  const serviceFee = Number(tariff.service_fee || 0);
  if (serviceFee > 0) {
    lineItems.push({ label: 'Service fee', kwh: 0, rate: serviceFee, amount: serviceFee });
  }
  const total = Math.round((energyCharge + serviceFee) * 100) / 100;

  const { period_start, period_end } = periodWindow(tariff.billing_period);
  const dueDate = addDays(new Date(period_end), 14).toISOString();

  const invoiceId = uuid();
  const invNum = invoiceNumber();

  await batch(env, [
    {
      sql: `INSERT INTO meter_readings (id, household_id, meter_id, agent_id, previous_reading_kwh,
              current_reading_kwh, kwh_consumed, source, peak_kwh, standard_kwh, off_peak_kwh,
              photo_url, notes, captured_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'AGENT', ?, ?, ?, ?, ?, ?)`,
      binds: [readingId, household.id, household.meter_id, deps.agent.id,
              prev, curr, consumed,
              body.peak_kwh ?? null, body.standard_kwh ?? null, body.off_peak_kwh ?? null,
              body.photo_url || null, body.notes || null, nowIso()],
    },
    {
      sql: `INSERT INTO electricity_invoices (id, invoice_number, household_id, tariff_id, reading_id,
              issued_by_agent_id, period_start, period_end, issue_date, due_date,
              previous_reading_kwh, current_reading_kwh, kwh_consumed,
              energy_charge, service_fee, total_amount, amount_paid, breakdown, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'ISSUED', ?, ?)`,
      binds: [invoiceId, invNum, household.id, tariff.id, readingId, deps.agent.id,
              period_start, period_end, nowIso(), dueDate,
              prev, curr, consumed,
              energyCharge, serviceFee, total,
              JSON.stringify(lineItems),
              nowIso(), nowIso()],
    },
    {
      sql: `UPDATE households SET last_reading_kwh = ?, last_reading_at = ?,
              current_balance = current_balance + ?, updated_at = ? WHERE id = ?`,
      binds: [curr, nowIso(), total, nowIso(), household.id],
    },
  ]);

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'invoice.issue',
    entity_type: 'invoice', entity_id: invoiceId,
    new: { invoice_number: invNum, household_id: household.id, kwh: consumed, total },
  });

  if (household.user_id) {
    await notify(env, household.user_id, {
      title: `New invoice ${invNum}`,
      body: `R${total.toFixed(2)} due ${new Date(dueDate).toLocaleDateString()} for ${consumed.toFixed(2)} kWh.`,
      category: 'INVOICE_ISSUED',
      data: { invoice_id: invoiceId, household_id: household.id },
    });
  }

  const inv = await one(env, 'SELECT * FROM electricity_invoices WHERE id = ?', invoiceId);
  const resp = invoicePublic(inv, household);
  await recordIdempotency(env, 'meter_reading', idempotencyKey, JSON.stringify(resp));
  return json(resp, 201);
}

export async function listInvoices(request, env, currentUser) {
  const url = new URL(request.url);
  const householdId = url.searchParams.get('household_id');
  const status = url.searchParams.get('status');
  let sql = 'SELECT * FROM electricity_invoices WHERE 1=1';
  const binds = [];
  if (householdId) {
    sql += ' AND household_id = ?';
    binds.push(householdId);
  } else {
    const ids = (await all(env, 'SELECT id FROM households WHERE user_id = ?', currentUser.id)).map((r) => r.id);
    if (!ids.length) return json([]);
    sql += ` AND household_id IN (${ids.map(() => '?').join(',')})`;
    binds.push(...ids);
  }
  if (status) { sql += ' AND status = ?'; binds.push(status); }
  sql += ' ORDER BY issue_date DESC LIMIT 200';
  const invoices = await all(env, sql, ...binds);
  if (!invoices.length) return json([]);
  const householdIds = [...new Set(invoices.map((i) => i.household_id))];
  const households = await all(
    env,
    `SELECT * FROM households WHERE id IN (${householdIds.map(() => '?').join(',')})`,
    ...householdIds,
  );
  const map = Object.fromEntries(households.map((h) => [h.id, h]));
  return json(invoices.map((i) => invoicePublic(i, map[i.household_id])));
}

export async function getInvoice(_request, env, _user, _deps, params) {
  const inv = await one(env, 'SELECT * FROM electricity_invoices WHERE id = ?', params.id);
  if (!inv) return error('Invoice not found', 404);
  const h = await one(env, 'SELECT * FROM households WHERE id = ?', inv.household_id);
  return json(invoicePublic(inv, h));
}

export async function invoiceReceipt(_request, env, _user, _deps, params) {
  const inv = await one(env, 'SELECT * FROM electricity_invoices WHERE id = ?', params.id);
  if (!inv) return error('Invoice not found', 404);
  const h = await one(env, 'SELECT * FROM households WHERE id = ?', inv.household_id);
  const lineItems = inv.breakdown ? JSON.parse(inv.breakdown) : [];

  const escape = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rows = lineItems.map((li) =>
    `<tr><td>${escape(li.label)}</td><td style='text-align:right'>${Number(li.kwh).toFixed(2)}</td>` +
    `<td style='text-align:right'>R${Number(li.rate).toFixed(4)}</td>` +
    `<td style='text-align:right'>R${Number(li.amount).toFixed(2)}</td></tr>`,
  ).join('');

  const dt = (s) => new Date(s).toLocaleDateString();
  const out = `<!doctype html>
<html><head><meta charset='utf-8'><title>Invoice ${escape(inv.invoice_number)}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 24px; color: #111; }
  h1 { margin: 0 0 4px; }
  .muted { color: #666; font-size: 13px; }
  .header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #eee; font-size: 14px; }
  th { text-align: left; background: #f7f7f7; }
  .total { font-weight: bold; border-top: 2px solid #111; }
  .meta { display: flex; justify-content: space-between; gap: 24px; margin: 16px 0; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; background: #eee; font-size: 12px; text-transform: uppercase; }
  .paid { background: #d4edda; color: #155724; }
  @media print { .no-print { display: none; } }
</style></head>
<body>
<div class='header'>
  <h1>Tax Invoice</h1>
  <p class='muted'>${escape(inv.invoice_number)} · <span class='badge ${inv.status === 'PAID' ? 'paid' : ''}'>${escape(inv.status)}</span></p>
</div>
<div class='meta'>
  <div>
    <strong>Billed to</strong><br>
    ${escape(h?.primary_contact_name || '—')}<br>
    ${escape(h?.account_number || '')}<br>
    ${escape(h?.street_address || '')}<br>
    ${escape(h?.suburb || '')} ${escape(h?.postal_code || '')}
  </div>
  <div style='text-align:right'>
    <strong>Period</strong><br>
    ${dt(inv.period_start)} – ${dt(inv.period_end)}<br>
    <strong>Issued</strong> ${dt(inv.issue_date)}<br>
    <strong>Due</strong> ${dt(inv.due_date)}
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th style='text-align:right'>kWh</th><th style='text-align:right'>Rate</th><th style='text-align:right'>Amount</th></tr></thead>
  <tbody>
    <tr><td colspan='2' class='muted'>Previous reading</td><td colspan='2' style='text-align:right'>${Number(inv.previous_reading_kwh).toFixed(2)} kWh</td></tr>
    <tr><td colspan='2' class='muted'>Current reading</td><td colspan='2' style='text-align:right'>${Number(inv.current_reading_kwh).toFixed(2)} kWh</td></tr>
    <tr><td colspan='2' class='muted'>Consumed</td><td colspan='2' style='text-align:right'><strong>${Number(inv.kwh_consumed).toFixed(2)} kWh</strong></td></tr>
    ${rows}
    <tr class='total'><td colspan='3'>Total due</td><td style='text-align:right'>R${Number(inv.total_amount).toFixed(2)}</td></tr>
    ${Number(inv.amount_paid || 0) > 0 ? `<tr><td colspan='3'>Paid</td><td style='text-align:right'>R${Number(inv.amount_paid).toFixed(2)}</td></tr>` : ''}
  </tbody>
</table>
<p class='muted' style='margin-top:32px;font-size:12px'>Issued by Lokal Platform.</p>
<button class='no-print' onclick='window.print()' style='margin-top:24px;padding:10px 20px;border:0;background:#111;color:#fff;border-radius:8px;cursor:pointer'>Print / Save as PDF</button>
</body></html>`;
  return html(out);
}

// ---------- Cash collections ----------

function collectionPublic(c, invoice) {
  return {
    id: c.id,
    receipt_number: c.receipt_number,
    invoice_id: c.invoice_id,
    invoice_number: invoice?.invoice_number || null,
    household_id: c.household_id,
    agent_id: c.agent_id,
    amount: Number(c.amount),
    status: c.status,
    agent_confirmed_at: c.agent_confirmed_at,
    household_confirmed_at: c.household_confirmed_at,
    household_confirm_code: c.status === 'PENDING_HOUSEHOLD_CONFIRM' ? c.household_confirm_code : null,
    settled: c.settled === 1,
    settlement_id: c.settlement_id,
    collected_at: c.collected_at,
  };
}

export async function createCollection(request, env, currentUser, deps) {
  const body = await readBody(request);
  const idempotencyKey = getIdempotencyKey(request, body);

  if (!body.invoice_id || body.amount == null) return error('invoice_id and amount required');

  if (idempotencyKey) {
    const cached = await checkIdempotency(env, 'collection_create', idempotencyKey);
    if (cached) return json(JSON.parse(cached), 200);
  }

  const invoice = await one(env, 'SELECT * FROM electricity_invoices WHERE id = ?', body.invoice_id);
  if (!invoice) return error('Invoice not found', 404);
  if (invoice.status === 'PAID') return error('Invoice already paid');
  if (invoice.status === 'CANCELLED') return error('Invoice cancelled');

  const outstanding = Number(invoice.total_amount) - Number(invoice.amount_paid || 0);
  const amount = Number(body.amount);
  if (Math.abs(amount - outstanding) > 0.005) {
    return error(`Cash amount must equal outstanding R${outstanding.toFixed(2)} (no partial payments)`);
  }

  // Reject duplicates: if there's already a PENDING collection on this invoice, return it.
  const dup = await one(
    env,
    `SELECT * FROM cash_collections WHERE invoice_id = ? AND status = 'PENDING_HOUSEHOLD_CONFIRM'`,
    invoice.id,
  );
  if (dup) {
    return error('A pending collection already exists for this invoice', 409);
  }

  const id = uuid();
  const code = confirmCode();
  await run(
    env,
    `INSERT INTO cash_collections (id, receipt_number, invoice_id, household_id, agent_id, amount,
     status, agent_confirmed_at, household_confirm_code, location_lat, location_lng, notes,
     settled, collected_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING_HOUSEHOLD_CONFIRM', ?, ?, ?, ?, ?, 0, ?)`,
    id, receiptNumber(), invoice.id, invoice.household_id, deps.agent.id, amount,
    nowIso(), code, body.location_lat || null, body.location_lng || null, body.notes || null,
    nowIso(),
  );

  const household = await one(env, 'SELECT * FROM households WHERE id = ?', invoice.household_id);
  if (household.user_id) {
    await notify(env, household.user_id, {
      title: 'Confirm cash payment',
      body: `Confirm R${amount.toFixed(2)} cash for invoice ${invoice.invoice_number}. Code: ${code}`,
      category: 'PAYMENT_CONFIRM_REQUEST',
      data: { collection_id: id, confirm_code: code },
    });
  }

  const c = await one(env, 'SELECT * FROM cash_collections WHERE id = ?', id);
  const resp = collectionPublic(c, invoice);
  await recordIdempotency(env, 'collection_create', idempotencyKey, JSON.stringify(resp));

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'collection.create',
    entity_type: 'cash_collection', entity_id: id,
    new: { invoice_id: invoice.id, amount, household_id: invoice.household_id },
  });

  return json(resp, 201);
}

export async function confirmCollection(request, env, currentUser, _deps, params) {
  const body = await readBody(request);
  const c = await one(env, 'SELECT * FROM cash_collections WHERE id = ?', params.id);
  if (!c) return error('Collection not found', 404);
  if (c.status !== 'PENDING_HOUSEHOLD_CONFIRM') return error(`Already ${c.status}`);
  if (c.household_confirm_code !== String(body.confirm_code)) return error('Invalid confirmation code');

  const inv = await one(env, 'SELECT * FROM electricity_invoices WHERE id = ?', c.invoice_id);
  const newPaid = Math.round((Number(inv.amount_paid || 0) + Number(c.amount)) * 100) / 100;
  const newStatus = newPaid >= Number(inv.total_amount) ? 'PAID' : inv.status;
  const amt = Number(c.amount);

  // Atomic state transition. The WHERE status= guard prevents double-confirm.
  await batch(env, [
    {
      sql: `UPDATE cash_collections SET status = 'CONFIRMED', household_confirmed_at = ?
            WHERE id = ? AND status = 'PENDING_HOUSEHOLD_CONFIRM'`,
      binds: [nowIso(), c.id],
    },
    {
      sql: `UPDATE electricity_invoices SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?`,
      binds: [newPaid, newStatus, nowIso(), inv.id],
    },
    {
      sql: `UPDATE households SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?`,
      binds: [amt, nowIso(), c.household_id],
    },
  ]);

  // Verify confirmation actually applied (race window)
  const after = await one(env, 'SELECT status FROM cash_collections WHERE id = ?', c.id);
  if (after?.status !== 'CONFIRMED') {
    return error('Concurrent update — collection state changed, please retry', 409);
  }

  await audit(env, request, {
    actor_user_id: currentUser.id, action: 'collection.confirm',
    entity_type: 'cash_collection', entity_id: c.id,
    new: { invoice_id: inv.id, amount: amt, invoice_status: newStatus },
  });

  const household = await one(env, 'SELECT user_id FROM households WHERE id = ?', c.household_id);
  if (household?.user_id) {
    await notify(env, household.user_id, {
      title: 'Payment confirmed',
      body: `R${amt.toFixed(2)} confirmed for invoice ${inv.invoice_number}.`,
      category: 'PAYMENT_RECEIVED',
      data: { invoice_id: inv.id, collection_id: c.id },
    });
  }

  const updated = await one(env, 'SELECT * FROM cash_collections WHERE id = ?', c.id);
  return json(collectionPublic(updated, inv));
}

export async function myCollections(request, env, _user, deps) {
  const url = new URL(request.url);
  const unsettledOnly = url.searchParams.get('unsettled_only') === 'true';
  let sql = 'SELECT * FROM cash_collections WHERE agent_id = ?';
  const binds = [deps.agent.id];
  if (unsettledOnly) {
    sql += " AND settled = 0 AND status = 'CONFIRMED'";
  }
  sql += ' ORDER BY collected_at DESC LIMIT 200';
  const cs = await all(env, sql, ...binds);
  if (!cs.length) return json([]);
  const invoiceIds = [...new Set(cs.map((x) => x.invoice_id))];
  const invs = await all(
    env,
    `SELECT id, invoice_number FROM electricity_invoices WHERE id IN (${invoiceIds.map(() => '?').join(',')})`,
    ...invoiceIds,
  );
  const map = Object.fromEntries(invs.map((i) => [i.id, i]));
  return json(cs.map((c) => collectionPublic(c, map[c.invoice_id])));
}

export async function cashOnHand(_request, env, _user, deps) {
  const r = await one(
    env,
    `SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS num FROM cash_collections
     WHERE agent_id = ? AND settled = 0 AND status = 'CONFIRMED'`,
    deps.agent.id,
  );
  return json({ amount: Number(r.amount || 0), num_collections: Number(r.num || 0) });
}
