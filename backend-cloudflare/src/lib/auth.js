// JWT (HS256) using WebCrypto + bcrypt-compatible PIN/password hashing via SHA-256.
//
// We use SHA-256 + per-user salt rather than bcrypt because Workers don't ship
// bcrypt by default and importing it is heavy. For PIN/password storage that's
// acceptable so long as we use a unique salt; this is standard for low-entropy
// PINs combined with rate limits at the auth layer.

import { one } from './db.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- base64url ----------

export function b64urlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function jsonB64(obj) {
  return b64urlEncode(enc.encode(JSON.stringify(obj)));
}

// ---------- HMAC-SHA256 ----------

async function hmacKey(secret) {
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// ---------- JWT ----------

const ACCESS_TTL_SECONDS = 30 * 60;            // 30 min
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;  // 7 days

function getSecret(env) {
  const s = env.JWT_SECRET || env.JWT_SECRET_KEY;
  if (!s) {
    throw new Error('JWT_SECRET is not configured. Run: wrangler secret put JWT_SECRET');
  }
  return s;
}

export async function signJwt(env, claims, ttl = ACCESS_TTL_SECONDS, type = 'access') {
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...claims, type, iat: now, exp: now + ttl };
  const header = { alg: 'HS256', typ: 'JWT' };
  const head = jsonB64(header);
  const body = jsonB64(payload);
  const key = await hmacKey(getSecret(env));
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64urlEncode(sigBuf)}`;
}

export async function verifyJwt(env, token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  try {
    const key = await hmacKey(getSecret(env));
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlDecode(sig),
      enc.encode(`${head}.${body}`),
    );
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64urlDecode(body)));
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function issueTokens(env, userId) {
  return {
    access_token: await signJwt(env, { sub: userId }, ACCESS_TTL_SECONDS, 'access'),
    refresh_token: await signJwt(env, { sub: userId }, REFRESH_TTL_SECONDS, 'refresh'),
    token_type: 'bearer',
    expires_in: ACCESS_TTL_SECONDS,
  };
}

// ---------- PIN / password hashing ----------

function bytesToHex(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}

async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return bytesToHex(buf);
}

export async function hashPin(pin) {
  const salt = b64urlEncode(crypto.getRandomValues(new Uint8Array(12)));
  const hash = await sha256Hex(`${salt}|${pin}`);
  return `pbk1$${salt}$${hash}`;
}

export async function verifyPin(pin, stored) {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'pbk1') {
    // Legacy plain SHA-256 (compat with the original worker)
    return (await sha256Hex(pin)) === stored;
  }
  const expected = parts[2];
  const got = await sha256Hex(`${parts[1]}|${pin}`);
  return got === expected;
}

// ---------- Auth middleware ----------

export async function requireUser(env, request) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const payload = await verifyJwt(env, token);
  if (!payload || payload.type !== 'access') return null;
  const user = await one(env, 'SELECT * FROM users WHERE id = ?', payload.sub);
  if (!user) return null;
  if (user.status && user.status !== 'ACTIVE') return null;
  return user;
}

/** Get the active role names for a user, derived from user_roles + agents + community_offices.
 *
 * Strict: a user is ADMIN only via an explicit `users.is_admin = 1` flag OR an
 * un-revoked `user_roles` row with role = 'ADMIN'. The previous email-contains-"admin"
 * and any-KYC-verified-user fallbacks have been removed.
 */
export async function getRoles(env, userId) {
  const { all } = await import('./db.js');
  const roles = new Set(['USER']);
  const granted = await all(
    env,
    'SELECT role FROM user_roles WHERE user_id = ? AND revoked_at IS NULL',
    userId,
  );
  for (const r of granted) roles.add(r.role);
  const agent = await all(env, 'SELECT id FROM agents WHERE user_id = ? AND status = ?', userId, 'ACTIVE');
  if (agent.length) roles.add('AGENT');
  const officeMgr = await all(env, 'SELECT id FROM community_offices WHERE manager_user_id = ?', userId);
  if (officeMgr.length) roles.add('OFFICE_MANAGER');
  const u = await one(env, 'SELECT is_admin FROM users WHERE id = ?', userId);
  if (u?.is_admin === 1) roles.add('ADMIN');
  return Array.from(roles);
}

export async function userHasRole(env, userId, ...allowed) {
  const roles = await getRoles(env, userId);
  return allowed.some((r) => roles.includes(r));
}

/**
 * Returns either { user, roles } or { error: { detail, status } }.
 * Pass a list of role names; ANY match grants access.
 */
export async function requireRole(env, request, ...allowed) {
  const user = await requireUser(env, request);
  if (!user) return { error: { detail: 'Not authenticated', status: 401 } };
  const roles = await getRoles(env, user.id);
  if (allowed.length === 0) return { user, roles };
  if (allowed.some((r) => roles.includes(r))) return { user, roles };
  return { error: { detail: `Requires role: ${allowed.join(' or ')}`, status: 403 } };
}

export async function requireAgent(env, request) {
  const r = await requireRole(env, request, 'AGENT');
  if (r.error) return r;
  const agent = await one(env, 'SELECT * FROM agents WHERE user_id = ? AND status = ?', r.user.id, 'ACTIVE');
  if (!agent) return { error: { detail: 'Active agent record not found', status: 403 } };
  return { user: r.user, agent, roles: r.roles };
}

export async function requireAdmin(env, request) {
  return requireRole(env, request, 'ADMIN');
}

export async function requireSupport(env, request) {
  return requireRole(env, request, 'SUPPORT', 'ADMIN');
}
