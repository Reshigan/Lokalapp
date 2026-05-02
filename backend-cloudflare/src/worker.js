// Lokal Platform — Cloudflare Worker (D1-backed).
//
// Modular router that dispatches HTTP requests to handler modules.

import { json, error, corsPreflight } from './lib/http.js';
import {
  requireUser, requireAgent, requireAdmin, requireSupport, requireRole,
} from './lib/auth.js';

import * as auth from './handlers/auth.js';
import * as users from './handlers/users.js';
import * as wallet from './handlers/wallet.js';
import * as agents from './handlers/agents.js';
import * as tariffs from './handlers/tariffs.js';
import * as offices from './handlers/offices.js';
import * as households from './handlers/households.js';
import * as billing from './handlers/billing.js';
import * as settlements from './handlers/settlements.js';
import * as notifications from './handlers/notifications.js';
import * as support from './handlers/support.js';
import * as products from './handlers/products.js';
import * as admin from './handlers/admin.js';

// ----- Route table -----
//
// Each entry: [method, pattern, handler, scope].
// pattern can include :params (e.g. '/billing/invoices/:id').
// scope: 'public' | 'user' | 'agent' | 'admin' | 'support' | 'office' | 'staff'

const ROUTES = [
  // ---- public ----
  ['GET',    '/',                              () => json({ name: 'Lokal Platform API', version: '3.0.0', backend: 'cloudflare-d1' }), 'public'],
  ['GET',    '/healthz',                       () => json({ status: 'ok' }),                                  'public'],
  ['POST',   '/auth/otp/request',              auth.requestOtp,         'public'],
  ['POST',   '/auth/otp/verify',               auth.verifyOtp,          'public'],
  ['POST',   '/auth/pin/login',                auth.loginWithPin,       'public'],
  ['POST',   '/auth/refresh',                  auth.refresh,            'public'],
  ['POST',   '/auth/register',                 auth.register,           'public'],
  ['POST',   '/auth/login',                    auth.loginWithPassword,  'public'],
  ['GET',    '/notifications/vapid-public-key', notifications.vapidPublicKey, 'public'],

  // ---- authed user ----
  ['POST',   '/auth/pin/set',                  auth.setPin,             'user'],
  ['POST',   '/auth/logout',                   auth.logout,             'user'],
  ['GET',    '/users/me',                      users.getMe,             'user'],
  ['PUT',    '/users/me',                      users.updateMe,          'user'],
  ['GET',    '/users/loyalty',                 users.getLoyalty,        'user'],
  ['GET',    '/wallet',                        wallet.getWallet,        'user'],
  ['GET',    '/wallet/transactions',           wallet.listTransactions, 'user'],
  ['POST',   '/wallet/topup',                  wallet.topup,            'user'],
  ['POST',   '/wallet/transfer',               wallet.transfer,         'user'],

  // ---- prepaid products ----
  ['GET',    '/wifi/packages',                 products.listWifiPackages,    'public'],
  ['POST',   '/wifi/purchase',                 products.purchaseWifi,        'user'],
  ['GET',    '/wifi/vouchers',                 products.listVouchers,        'user'],
  ['POST',   '/wifi/vouchers/:id/activate',    products.activateVoucher,     'user'],
  ['GET',    '/electricity/packages',          products.listElectricityPackages, 'public'],
  ['POST',   '/electricity/purchase',          products.purchaseElectricity, 'user'],
  ['GET',    '/electricity/meters',            products.listMyMeters,        'user'],
  ['POST',   '/electricity/meters/register',   products.registerMeter,       'user'],

  // ---- tariffs ----
  ['GET',    '/tariffs/',                      tariffs.listTariffs,     'user'],
  ['GET',    '/tariffs/:id',                   tariffs.getTariff,       'user'],
  ['POST',   '/tariffs/',                      tariffs.createTariff,    'admin'],
  ['DELETE', '/tariffs/:id',                   tariffs.deactivateTariff, 'admin'],

  // ---- community offices ----
  ['GET',    '/community-offices/',            offices.listOffices,     'user'],
  ['POST',   '/community-offices/',            offices.createOffice,    'admin'],

  // ---- households ----
  ['GET',    '/households/',                   households.listHouseholds, 'agent'],
  ['GET',    '/households/mine',               households.myHouseholds,   'user'],
  ['POST',   '/households/',                   households.createHousehold, 'agent'],
  ['GET',    '/households/:id',                households.getHousehold,    'user'],
  ['PUT',    '/households/:id',                households.updateHousehold, 'agent'],

  // ---- billing ----
  ['POST',   '/billing/readings',                       billing.captureReading,    'agent'],
  ['GET',    '/billing/invoices',                       billing.listInvoices,      'user'],
  ['GET',    '/billing/invoices/:id',                   billing.getInvoice,        'user'],
  ['GET',    '/billing/invoices/:id/receipt',           billing.invoiceReceipt,    'user'],
  ['POST',   '/billing/collections',                    billing.createCollection,  'agent'],
  ['POST',   '/billing/collections/:id/confirm',        billing.confirmCollection, 'user'],
  ['GET',    '/billing/collections/mine',               billing.myCollections,     'agent'],
  ['GET',    '/billing/collections/cash-on-hand',       billing.cashOnHand,        'agent'],

  // ---- settlements ----
  ['POST',   '/settlements/',                  settlements.submitSettlement, 'agent'],
  ['POST',   '/settlements/:id/confirm',       settlements.confirmSettlement, 'office'],
  ['GET',    '/settlements/',                  settlements.listSettlements,  'user'],
  ['GET',    '/settlements/:id',               settlements.getSettlement,    'user'],

  // ---- agent ----
  ['POST',   '/agent/register',                agents.registerAgent,    'user'],
  ['GET',    '/agent/profile',                 agents.getAgentProfile,  'agent'],
  ['GET',    '/agent/float',                   agents.getFloat,         'agent'],
  ['POST',   '/agent/float/topup',             agents.topupFloat,       'agent'],
  ['GET',    '/agent/alerts',                  agents.getAlerts,        'agent'],
  ['PUT',    '/agent/alerts/settings',         agents.updateAlertSettings, 'agent'],
  ['GET',    '/agent/customers',               agents.listCustomers,    'agent'],
  ['GET',    '/agent/customers/search',        agents.searchCustomers,  'agent'],
  ['POST',   '/agent/customers',               agents.registerCustomer, 'agent'],
  ['GET',    '/agent/customers/:id',           agents.customerDetail,   'agent'],
  ['POST',   '/agent/transaction',             agents.processTransaction, 'agent'],
  ['GET',    '/agent/commissions',             agents.getCommissions,    'agent'],
  ['POST',   '/agent/commissions/withdraw',    agents.withdrawCommission, 'agent'],
  ['GET',    '/agent/sales-report',            agents.salesReport,      'agent'],
  ['GET',    '/agent/sales/report',            agents.salesReport,      'agent'],

  // ---- notifications ----
  ['POST',   '/notifications/subscribe',       notifications.subscribe,    'user'],
  ['DELETE', '/notifications/subscribe',       notifications.unsubscribe,  'user'],
  ['GET',    '/notifications/',                notifications.listNotifications, 'user'],
  ['POST',   '/notifications/:id/read',        notifications.markRead,     'user'],
  ['POST',   '/notifications/test',            notifications.sendTest,     'user'],

  // ---- support ----
  ['POST',   '/support/tickets',                       support.createTicket,        'user'],
  ['GET',    '/support/tickets',                       support.listTickets,         'user'],
  ['GET',    '/support/tickets/:id',                   support.getTicket,           'user'],
  ['POST',   '/support/tickets/:id/messages',          support.replyTicket,         'user'],
  ['POST',   '/support/tickets/:id/status',            support.updateTicketStatus,  'support'],
  ['POST',   '/support/tickets/:id/assign',            support.assignTicket,        'support'],
  ['GET',    '/support/roles',                         support.listRoles,           'admin'],
  ['POST',   '/support/roles/grant',                   support.grantRole,           'admin'],
  ['POST',   '/support/roles/revoke',                  support.revokeRole,          'admin'],

  // ---- admin ----
  ['GET',    '/admin/dashboard/stats',         admin.dashboardStats,    'admin'],
  ['GET',    '/admin/users',                   admin.listUsers,         'admin'],
  ['GET',    '/admin/users/:id',               admin.getUser,           'admin'],
  ['PUT',    '/admin/users/:id/status',        admin.updateUserStatus,  'admin'],
  ['PUT',    '/admin/users/:id/kyc',           admin.updateUserKyc,     'admin'],
  ['POST',   '/admin/users/:id/wallet/adjust', admin.adjustUserWallet,  'admin'],
  ['GET',    '/admin/agents',                  admin.listAgents,        'admin'],
  ['PUT',    '/admin/agents/:id/tier',         admin.updateAgentTier,   'admin'],
  ['PUT',    '/admin/agents/:id/status',       admin.updateAgentStatus, 'admin'],
  ['POST',   '/admin/agents/:id/float/adjust', admin.adjustAgentFloat,  'admin'],
  ['GET',    '/admin/products/wifi',           admin.listAdminWifi,     'admin'],
  ['POST',   '/admin/products/wifi',           admin.createAdminWifi,   'admin'],
  ['PUT',    '/admin/products/wifi/:id',       admin.updateAdminWifi,   'admin'],
  ['GET',    '/admin/products/electricity',    admin.listAdminElectricity, 'admin'],
  ['POST',   '/admin/products/electricity',    admin.createAdminElectricity, 'admin'],
  ['GET',    '/admin/reports/revenue',         admin.revenueReport,     'admin'],
  ['GET',    '/admin/reports/agents',          admin.agentReport,       'admin'],
  ['GET',    '/admin/analytics',               admin.adminAnalytics,    'admin'],
  ['GET',    '/admin/analytics/revenue',       admin.revenueReport,     'admin'],
  ['GET',    '/admin/audit-logs',              admin.auditLogs,         'admin'],
  ['GET',    '/admin/reconciliation',          admin.reconciliation,    'admin'],
  ['POST',   '/admin/invoices/:id/cancel',     admin.cancelInvoice,     'admin'],
  ['POST',   '/admin/collections/:id/void',    admin.voidCollection,    'admin'],
  ['POST',   '/admin/transactions/:id/refund', admin.refundTransaction, 'admin'],

  ['GET',    '/admin/settings/payment-gateways',     admin.listPaymentGateways,   'admin'],
  ['POST',   '/admin/settings/payment-gateways',     admin.createPaymentGateway,  'admin'],
  ['PUT',    '/admin/settings/payment-gateways/:id', admin.updatePaymentGateway,  'admin'],
  ['DELETE', '/admin/settings/payment-gateways/:id', admin.deletePaymentGateway,  'admin'],
  ['GET',    '/admin/settings/bank-accounts',        admin.listBankAccounts,      'admin'],
  ['POST',   '/admin/settings/bank-accounts',        admin.createBankAccount,     'admin'],
  ['PUT',    '/admin/settings/bank-accounts/:id',    admin.updateBankAccount,     'admin'],
  ['DELETE', '/admin/settings/bank-accounts/:id',    admin.deleteBankAccount,     'admin'],
  ['GET',    '/admin/settings/iot-devices',          admin.listIotDevices,        'admin'],
  ['POST',   '/admin/settings/iot-devices',          admin.createIotDevice,       'admin'],
  ['PUT',    '/admin/settings/iot-devices/:id',      admin.updateIotDevice,       'admin'],
  ['DELETE', '/admin/settings/iot-devices/:id',      admin.deleteIotDevice,       'admin'],

  // ---- analytics + referrals ----
  ['GET',    '/analytics',                    admin.userAnalytics,     'user'],
  ['POST',   '/referrals/apply',              admin.applyReferral,     'user'],
  ['GET',    '/referrals/stats',              admin.referralStats,     'user'],
];

// ----- Pattern matcher -----

function matchRoute(method, path) {
  for (const [m, pattern, handler, scope] of ROUTES) {
    if (m !== method) continue;
    const params = matchPattern(pattern, path);
    if (params !== null) return { handler, scope, params };
  }
  return null;
}

function matchPattern(pattern, path) {
  if (pattern === path) return {};
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

// ----- Scope authorisation -----

async function authorize(scope, env, request) {
  if (scope === 'public') return { ok: true };
  if (scope === 'user') {
    const user = await requireUser(env, request);
    if (!user) return { error: { detail: 'Not authenticated', status: 401 } };
    return { ok: true, user };
  }
  if (scope === 'agent') {
    const r = await requireAgent(env, request);
    if (r.error) return { error: r.error };
    return { ok: true, user: r.user, deps: { agent: r.agent }, roles: r.roles };
  }
  if (scope === 'admin') {
    const r = await requireAdmin(env, request);
    if (r.error) return { error: r.error };
    return { ok: true, user: r.user, roles: r.roles };
  }
  if (scope === 'support') {
    const r = await requireSupport(env, request);
    if (r.error) return { error: r.error };
    return { ok: true, user: r.user, roles: r.roles };
  }
  if (scope === 'office') {
    const r = await requireRole(env, request, 'OFFICE_MANAGER', 'ADMIN', 'SUPPORT');
    if (r.error) return { error: r.error };
    return { ok: true, user: r.user, roles: r.roles };
  }
  if (scope === 'staff') {
    const r = await requireRole(env, request, 'AGENT', 'OFFICE_MANAGER', 'ADMIN', 'SUPPORT');
    if (r.error) return { error: r.error };
    return { ok: true, user: r.user, roles: r.roles };
  }
  return { error: { detail: 'Unknown scope', status: 500 } };
}

// ----- Main fetch handler -----

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsPreflight();

    const url = new URL(request.url);
    let path = url.pathname.replace(/\/+$/, '') || '/';
    // Preserve trailing-slash variants for routes that use them
    if (url.pathname.endsWith('/') && url.pathname !== '/') path = url.pathname;

    const route = matchRoute(request.method, path) || matchRoute(request.method, url.pathname);
    if (!route) return error('Not found', 404);

    try {
      const auth = await authorize(route.scope, env, request);
      if (auth.error) return error(auth.error.detail, auth.error.status);
      return await route.handler(request, env, auth.user, auth.deps, route.params);
    } catch (e) {
      console.error('Handler error', e?.stack || e);
      return error(`Internal error: ${e?.message || e}`, 500);
    }
  },
};
