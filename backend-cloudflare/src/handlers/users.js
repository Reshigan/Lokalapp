import { json, readBody, error } from '../lib/http.js';
import { one, run, all, nowIso } from '../lib/db.js';
import { getRoles } from '../lib/auth.js';

function publicUser(user, roles, hasPin) {
  return {
    id: user.id,
    phone_number: user.phone_number,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    kyc_status: user.kyc_status,
    status: user.status,
    referral_code: user.referral_code,
    loyalty_points: user.loyalty_points || 0,
    has_pin: !!hasPin,
    is_agent: roles.includes('AGENT'),
    is_admin: roles.includes('ADMIN'),
    is_support: roles.includes('SUPPORT'),
    is_office_manager: roles.includes('OFFICE_MANAGER'),
    roles,
  };
}

export async function getMe(_request, env, currentUser) {
  const roles = await getRoles(env, currentUser.id);
  return json(publicUser(currentUser, roles, currentUser.pin_hash));
}

export async function updateMe(request, env, currentUser) {
  const body = await readBody(request);
  const fields = ['first_name', 'last_name', 'email', 'id_number'];
  const sets = [];
  const binds = [];
  for (const f of fields) {
    if (f in body) { sets.push(`${f} = ?`); binds.push(body[f]); }
  }
  if (!sets.length) return error('No fields to update');
  sets.push('updated_at = ?');
  binds.push(nowIso());
  binds.push(currentUser.id);
  await run(env, `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...binds);
  const updated = await one(env, 'SELECT * FROM users WHERE id = ?', currentUser.id);
  const roles = await getRoles(env, currentUser.id);
  return json(publicUser(updated, roles, updated.pin_hash));
}

function tierFor(points) {
  if (points >= 5000) return 'PLATINUM';
  if (points >= 2000) return 'GOLD';
  if (points >= 500)  return 'SILVER';
  return 'BRONZE';
}
function nextTierAt(points) {
  if (points < 500)  return 500;
  if (points < 2000) return 2000;
  if (points < 5000) return 5000;
  return points;  // already platinum
}

export async function getLoyalty(_request, env, currentUser) {
  const referrals = await all(env, 'SELECT id FROM users WHERE referred_by = ?', currentUser.id);
  const points = Number(currentUser.loyalty_points || 0);
  return json({
    points,
    tier: tierFor(points),
    next_tier_points: Math.max(0, nextTierAt(points) - points),
    rewards_available: Math.floor(points / 100),
    referral_code: currentUser.referral_code,
    total_referrals: referrals.length,
  });
}
