// Authentication handlers — OTP, PIN, refresh, logout.

import { json, error, readBody, noContent } from '../lib/http.js';
import { one, run, nowIso } from '../lib/db.js';
import { uuid, otp as genOtp, referralCode } from '../lib/ids.js';
import {
  hashPin, verifyPin, issueTokens, signJwt, verifyJwt,
} from '../lib/auth.js';
import { checkRateLimit } from '../lib/ratelimit.js';

const OTP_EXPIRY_SECONDS = 5 * 60;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const PHONE_RE = /^\+27[0-9]{9}$/;

/**
 * Whether to expose the OTP code in the API response.
 * - Default: NO (production safety)
 * - Set DEV_MODE=true on the worker to enable for local/QA only.
 * Setting SMS_PROVIDER no longer disables this — that footgun was bait.
 */
function shouldExposeDebugOtp(env) {
  return String(env?.DEV_MODE || '').toLowerCase() === 'true';
}

function normalizePhone(p) {
  if (!p) return '';
  p = String(p).replace(/[^\d+]/g, '');
  if (p.startsWith('0')) p = '+27' + p.slice(1);
  else if (!p.startsWith('+')) p = '+27' + p;
  return p;
}

async function findOrCreateWallet(env, userId) {
  let wallet = await one(env, 'SELECT * FROM wallets WHERE user_id = ?', userId);
  if (!wallet) {
    const id = uuid();
    await run(
      env,
      `INSERT INTO wallets (id, user_id, balance, currency, status,
                            daily_limit, monthly_limit, daily_spent, monthly_spent, created_at, updated_at)
       VALUES (?, ?, 0, 'ZAR', 'ACTIVE', 5000, 50000, 0, 0, ?, ?)`,
      id, userId, nowIso(), nowIso(),
    );
    wallet = await one(env, 'SELECT * FROM wallets WHERE id = ?', id);
  }
  return wallet;
}

// ---------- OTP request ----------

export async function requestOtp(request, env) {
  const body = await readBody(request);
  const phone = normalizePhone(body.phone_number);
  if (!PHONE_RE.test(phone)) {
    return error('Invalid phone number (must be +27XXXXXXXXX)');
  }

  // Rate limit: max 5 OTP requests per phone per hour, plus a soft per-IP guard.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const phoneRl = await checkRateLimit(env, 'otp_request_phone', phone, { max: 5, windowSec: 3600 });
  if (!phoneRl.ok) {
    return error(`Too many OTP requests. Try again in ${phoneRl.retryAfter}s`, 429);
  }
  const ipRl = await checkRateLimit(env, 'otp_request_ip', ip, { max: 30, windowSec: 3600 });
  if (!ipRl.ok) {
    return error(`Too many OTP requests from this network. Try again in ${ipRl.retryAfter}s`, 429);
  }

  const code = genOtp();
  const id = uuid();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();
  await run(
    env,
    `INSERT INTO otp_codes (id, phone_number, code, attempts, expires_at, used, created_at)
     VALUES (?, ?, ?, 0, ?, 0, ?)`,
    id, phone, code, expiresAt, nowIso(),
  );

  // TODO: SMS dispatch via env.SMS_PROVIDER (Twilio/MessageBird/etc.)

  return json({
    message: 'OTP sent successfully',
    expires_in: OTP_EXPIRY_SECONDS,
    debug_otp: shouldExposeDebugOtp(env) ? code : undefined,
  });
}

// ---------- OTP verify ----------

export async function verifyOtp(request, env) {
  const body = await readBody(request);
  const phone = normalizePhone(body.phone_number);
  const code = String(body.code || '');
  if (!PHONE_RE.test(phone)) return error('Invalid phone number');
  if (code.length !== 6) return error('Invalid OTP code');

  // IP-level brute-force defence. 30 verify tries per IP per hour.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipRl = await checkRateLimit(env, 'otp_verify_ip', ip, { max: 30, windowSec: 3600 });
  if (!ipRl.ok) {
    return error(`Too many OTP attempts. Try again in ${ipRl.retryAfter}s`, 429);
  }

  const otpRow = await one(
    env,
    `SELECT * FROM otp_codes
     WHERE phone_number = ? AND used = 0
     ORDER BY created_at DESC LIMIT 1`,
    phone,
  );
  if (!otpRow) return error('No pending OTP for this number', 400);
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return error('OTP expired', 400);
  }
  if (otpRow.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
    // Lock this OTP — they need to request a fresh one
    await run(env, 'UPDATE otp_codes SET used = 1 WHERE id = ?', otpRow.id);
    return error('Too many failed attempts on this code. Request a new one.', 429);
  }
  if (otpRow.code !== code) {
    const newAttempts = (otpRow.attempts || 0) + 1;
    await run(env, 'UPDATE otp_codes SET attempts = ? WHERE id = ?', newAttempts, otpRow.id);
    if (newAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      await run(env, 'UPDATE otp_codes SET used = 1 WHERE id = ?', otpRow.id);
    }
    return error('Invalid OTP', 400);
  }
  await run(env, 'UPDATE otp_codes SET used = 1 WHERE id = ?', otpRow.id);

  let user = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  let isNew = false;
  if (!user) {
    isNew = true;
    const id = uuid();
    await run(
      env,
      `INSERT INTO users (id, phone_number, kyc_status, status, referral_code, loyalty_points, created_at, updated_at)
       VALUES (?, ?, 'PENDING', 'ACTIVE', ?, 0, ?, ?)`,
      id, phone, referralCode(), nowIso(), nowIso(),
    );
    user = await one(env, 'SELECT * FROM users WHERE id = ?', id);
    await findOrCreateWallet(env, user.id);
  }

  // Bootstrap: grant ADMIN to phones listed in env.BOOTSTRAP_ADMIN_PHONES
  // (comma-separated). Idempotent — once granted, the env var can be cleared.
  // Use this to seed the very first admin on a fresh deploy.
  const bootstrapList = String(env.BOOTSTRAP_ADMIN_PHONES || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (bootstrapList.includes(phone) && user.is_admin !== 1) {
    await run(env, 'UPDATE users SET is_admin = 1 WHERE id = ?', user.id);
    const existingRole = await one(
      env,
      "SELECT id FROM user_roles WHERE user_id = ? AND role = 'ADMIN' AND revoked_at IS NULL",
      user.id,
    );
    if (!existingRole) {
      await run(
        env,
        `INSERT INTO user_roles (id, user_id, role, granted_by_user_id, granted_at, notes)
         VALUES (?, ?, 'ADMIN', NULL, ?, 'bootstrap')`,
        uuid(), user.id, nowIso(),
      );
    }
    user = await one(env, 'SELECT * FROM users WHERE id = ?', user.id);
  }

  const tokens = await issueTokens(env, user.id);

  // Persist refresh token (so we can revoke server-side on logout)
  await run(
    env,
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
    uuid(), user.id, tokens.refresh_token,
    new Date(Date.now() + 7 * 86400_000).toISOString(),
    nowIso(),
  );

  // Detect roles
  const agent = await one(env, 'SELECT id FROM agents WHERE user_id = ?', user.id);

  return json({
    ...tokens,
    user_id: user.id,
    is_new_user: isNew,
    is_agent: !!agent,
    is_admin: user.is_admin === 1,
  });
}

// ---------- PIN set / login ----------

export async function setPin(request, env, currentUser) {
  const body = await readBody(request);
  const pin = String(body.pin || '');
  if (!/^\d{4,6}$/.test(pin)) return error('PIN must be 4–6 digits');
  const hash = await hashPin(pin);
  await run(env, 'UPDATE users SET pin_hash = ?, updated_at = ? WHERE id = ?',
    hash, nowIso(), currentUser.id);
  return json({ message: 'PIN updated' });
}

export async function loginWithPin(request, env) {
  const body = await readBody(request);
  const phone = normalizePhone(body.phone_number);
  const pin = String(body.pin || '');
  const user = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  if (!user || !user.pin_hash) return error('Invalid credentials', 401);
  if (!(await verifyPin(pin, user.pin_hash))) return error('Invalid credentials', 401);
  const tokens = await issueTokens(env, user.id);
  const agent = await one(env, 'SELECT id FROM agents WHERE user_id = ?', user.id);
  return json({
    ...tokens,
    user_id: user.id,
    is_agent: !!agent,
    is_admin: user.is_admin === 1,
  });
}

// ---------- Refresh / logout ----------

export async function refresh(request, env) {
  const body = await readBody(request);
  const token = String(body.refresh_token || '');
  const payload = await verifyJwt(env, token);
  if (!payload || payload.type !== 'refresh') return error('Invalid refresh token', 401);

  const stored = await one(
    env,
    'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0',
    token,
  );
  if (!stored) return error('Refresh token revoked or unknown', 401);

  // Verify expiry server-side as well as via JWT exp.
  if (new Date(stored.expires_at).getTime() < Date.now()) {
    await run(env, 'UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', stored.id);
    return error('Refresh token expired', 401);
  }

  // Check the user is still ACTIVE — suspension should kick in immediately.
  const user = await one(env, 'SELECT status FROM users WHERE id = ?', payload.sub);
  if (!user || user.status !== 'ACTIVE') return error('User not active', 401);

  const access = await signJwt(env, { sub: payload.sub }, 30 * 60, 'access');
  return json({ access_token: access, token_type: 'bearer', expires_in: 1800 });
}

export async function logout(request, env, currentUser) {
  // Revoke all refresh tokens for this user
  await run(env, 'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', currentUser.id);
  return noContent();
}

// ---------- Password register / login (kept for legacy UI) ----------

export async function register(request, env) {
  const body = await readBody(request);
  const phone = normalizePhone(body.phone_number);
  if (!PHONE_RE.test(phone)) return error('Invalid phone number');
  const password = String(body.password || '');
  if (password.length < 6) return error('Password must be ≥ 6 chars');

  const existing = await one(env, 'SELECT id FROM users WHERE phone_number = ?', phone);
  if (existing) return error('User already exists', 400);

  const id = uuid();
  const passHash = await hashPin(password);
  await run(
    env,
    `INSERT INTO users (id, phone_number, first_name, last_name, password_hash,
       kyc_status, status, referral_code, loyalty_points, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', 'ACTIVE', ?, 0, ?, ?)`,
    id, phone, body.first_name || null, body.last_name || null, passHash,
    referralCode(), nowIso(), nowIso(),
  );
  await findOrCreateWallet(env, id);
  const tokens = await issueTokens(env, id);
  return json({
    ...tokens, user_id: id, is_new_user: true, is_agent: false, is_admin: false,
  }, 201);
}

export async function loginWithPassword(request, env) {
  const body = await readBody(request);
  const phone = normalizePhone(body.phone_number);
  const password = String(body.password || '');
  const user = await one(env, 'SELECT * FROM users WHERE phone_number = ?', phone);
  if (!user || !user.password_hash) return error('Invalid credentials', 401);
  if (!(await verifyPin(password, user.password_hash))) return error('Invalid credentials', 401);
  const tokens = await issueTokens(env, user.id);
  const agent = await one(env, 'SELECT id FROM agents WHERE user_id = ?', user.id);
  return json({
    ...tokens,
    user_id: user.id,
    is_agent: !!agent,
    is_admin: user.is_admin === 1,
  });
}
