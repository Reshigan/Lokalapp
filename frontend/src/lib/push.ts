import { api } from '@/services/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return window.btoa(s);
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
}

export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'Push not supported in this browser' };

  const perm = await requestPushPermission();
  if (perm !== 'granted') return { ok: false, reason: 'Permission denied' };

  const registration = await navigator.serviceWorker.ready;
  const keyResp = await api.getVapidPublicKey();
  if (keyResp.error || !keyResp.data?.public_key) {
    return { ok: false, reason: 'Server has no VAPID key configured' };
  }

  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyResp.data.public_key),
    });
  }

  const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
  const p256dh = json.keys?.p256dh || arrayBufferToBase64(sub.getKey('p256dh'));
  const auth = json.keys?.auth || arrayBufferToBase64(sub.getKey('auth'));

  if (!json.endpoint || !p256dh || !auth) return { ok: false, reason: 'Subscription missing keys' };

  const resp = await api.subscribePush({
    endpoint: json.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
  });
  if (resp.error) return { ok: false, reason: resp.error };
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean }> {
  if (!isPushSupported()) return { ok: false };
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return { ok: true };
  await api.unsubscribePush(sub.endpoint);
  await sub.unsubscribe();
  return { ok: true };
}
