// ID + reference number generators.

const DIGITS = '0123456789';
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function digits(n) {
  let s = '';
  const buf = crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) s += DIGITS[buf[i] % 10];
  return s;
}

function alphanum(n) {
  let s = '';
  const buf = crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) s += ALPHANUM[buf[i] % ALPHANUM.length];
  return s;
}

function dateStamp(includeTime = false) {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (!includeTime) return `${y}${m}${day}`;
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}${m}${day}${h}${mi}`;
}

export const uuid = () => crypto.randomUUID();
export const otp = () => digits(6);
export const confirmCode = () => digits(6);
export const accountNumber = () => 'AC' + digits(8);
export const agentCode = () => 'AG' + digits(6);
export const referralCode = () => alphanum(8);
export const voucherCode = () => alphanum(12);
export const invoiceNumber = () => `INV-${dateStamp()}-${digits(5)}`;
export const receiptNumber = () => `RC-${dateStamp()}-${digits(5)}`;
export const settlementRef = () => `ST-${dateStamp(true)}-${digits(4)}`;
export const transactionRef = () => `TXN${dateStamp(true)}${alphanum(6)}`;
