// Web Push (RFC 8030 + RFC 8291 aes128gcm content encoding) implementation
// using only WebCrypto. Designed to run inside a Cloudflare Worker.
//
// Two pieces:
//   1. VAPID JWT signing (ECDSA P-256 over the request to the push service)
//   2. AES-128-GCM payload encryption with HKDF and the subscriber's keys
//
// Reference: https://datatracker.ietf.org/doc/html/rfc8291

import { b64urlEncode, b64urlDecode } from './auth.js';

const enc = new TextEncoder();

// ---------- helpers ----------

function concat(...parts) {
  let len = 0;
  for (const p of parts) len += p.byteLength;
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p instanceof Uint8Array ? p : new Uint8Array(p), off);
    off += p.byteLength;
  }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// ---------- VAPID JWT (ES256) ----------

function pemPrivateToJwk(privateKeyB64Url) {
  // The user-supplied VAPID private key is the raw 32-byte d value, base64url.
  const d = b64urlDecode(privateKeyB64Url);
  if (d.length !== 32) throw new Error('VAPID_PRIVATE_KEY must be 32 bytes (base64url)');
  return d;
}

function rawPublicToJwk(publicKeyB64Url) {
  // Uncompressed P-256 public key: 0x04 || X(32) || Y(32)
  const raw = b64urlDecode(publicKeyB64Url);
  if (raw.length !== 65 || raw[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be 65-byte uncompressed P-256 (base64url)');
  }
  return {
    x: b64urlEncode(raw.slice(1, 33)),
    y: b64urlEncode(raw.slice(33, 65)),
  };
}

async function importVapidKey(env) {
  const priv = pemPrivateToJwk(env.VAPID_PRIVATE_KEY);
  const pub = rawPublicToJwk(env.VAPID_PUBLIC_KEY);
  return await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: pub.x,
      y: pub.y,
      d: b64urlEncode(priv),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function signVapidJwt(env, audience, expiresInSeconds = 12 * 60 * 60) {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expiresInSeconds,
    sub: env.VAPID_SUBJECT || 'mailto:admin@lokal.local',
  };
  const head = b64urlEncode(enc.encode(JSON.stringify(header)));
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await importVapidKey(env);
  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64urlEncode(sigBuf)}`;
}

// ---------- aes128gcm payload encryption ----------

async function deriveSharedSecret(localPrivJwk, remotePubRaw) {
  // local: ephemeral keypair, remote: subscriber's p256dh (uncompressed)
  const localKey = await crypto.subtle.importKey(
    'jwk', localPrivJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, ['deriveBits'],
  );
  const remoteKey = await crypto.subtle.importKey(
    'raw', remotePubRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, [],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: remoteKey }, localKey, 256,
  );
  return new Uint8Array(bits);
}

async function encryptAes128Gcm(payload, subscription) {
  const userPubRaw = b64urlDecode(subscription.p256dh);    // 65 bytes uncompressed
  const userAuth = b64urlDecode(subscription.auth);        // 16 bytes

  // 1. Generate ephemeral ECDH P-256 keypair (local server)
  const local = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const localPubJwk = await crypto.subtle.exportKey('jwk', local.publicKey);
  const localPrivJwk = await crypto.subtle.exportKey('jwk', local.privateKey);

  // Reconstruct local public uncompressed (0x04 || X || Y)
  const localPubRaw = concat(
    new Uint8Array([0x04]),
    b64urlDecode(localPubJwk.x),
    b64urlDecode(localPubJwk.y),
  );

  // 2. Shared ECDH secret
  const sharedSecret = await deriveSharedSecret(localPrivJwk, userPubRaw);

  // 3. Build PRK_key via HKDF(salt=auth, ikm=sharedSecret, info='WebPush: info\0' || ua_public || as_public)
  const keyInfo = concat(
    enc.encode('WebPush: info\0'),
    userPubRaw,
    localPubRaw,
  );
  const ikm = await hkdf(userAuth, sharedSecret, keyInfo, 32);

  // 4. Random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. Derive Content-Encryption Key (16 bytes)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);

  // 6. Derive Nonce (12 bytes)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // 7. Encrypt: plaintext padded with 0x02 then any 0x00s; here we use minimum (just 0x02)
  const plaintext = concat(payload, new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cekKey,
    plaintext,
  );
  const ciphertext = new Uint8Array(ciphertextBuf);

  // 8. Build aes128gcm header: salt(16) || rs(4 BE) || idlen(1) || keyid (idlen bytes)
  // For Web Push the keyid is the as_public (local) key, length 65
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPubRaw.length);
  header.set(salt, 0);
  // rs as 32-bit big-endian
  header[16] = (rs >>> 24) & 0xff;
  header[17] = (rs >>> 16) & 0xff;
  header[18] = (rs >>> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = localPubRaw.length;
  header.set(localPubRaw, 21);

  return concat(header, ciphertext);
}

// ---------- public API ----------

export function isPushConfigured(env) {
  return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export async function sendPush(env, subscription, payloadObj) {
  if (!isPushConfigured(env)) return { ok: false, reason: 'not_configured' };
  try {
    const payload = enc.encode(JSON.stringify(payloadObj));
    const body = await encryptAes128Gcm(payload, subscription);

    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await signVapidJwt(env, audience);

    const resp = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      },
      body,
    });

    if (resp.status === 410 || resp.status === 404) {
      return { ok: false, reason: 'gone' };  // subscription expired — caller should mark inactive
    }
    if (!resp.ok) {
      return { ok: false, reason: `http_${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', message: String(e?.message || e) };
  }
}
