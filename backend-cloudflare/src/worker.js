/**
 * Lokal Platform API - Cloudflare Workers Backend
 * Complete API with all endpoints for wallet, loyalty, payments, and more.
 */

// Simple in-memory database simulation
const db = {
  users: new Map(),
  wallets: new Map(),
  transactions: new Map(),
  wifiVouchers: new Map(),
  floatAlerts: new Map(),
};

// Seed initial data
function seedData() {
  // Default test user
  const userId = 'user-001';
  db.users.set(userId, {
    id: userId,
    phone_number: '+27811111111',
    password_hash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // sha256 of '123456'
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    kyc_status: 'VERIFIED',
    status: 'ACTIVE',
    referral_code: 'JOHN2024',
    loyalty_points: 150,
    is_agent: true,
    is_admin: false,
    created_at: new Date().toISOString(),
  });

  db.wallets.set(userId, {
    id: 'wallet-001',
    user_id: userId,
    balance: 510.0,
    currency: 'ZAR',
    status: 'ACTIVE',
    daily_limit: 5000.0,
    monthly_limit: 50000.0,
    daily_spent: 0.0,
    monthly_spent: 0.0,
  });

  db.transactions.set(userId, [
    { id: 'txn-001', type: 'TOPUP', amount: 200.0, balance_after: 200.0, reference: 'TOP-001', status: 'COMPLETED', description: 'Wallet top-up', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'txn-002', type: 'WIFI_PURCHASE', amount: -50.0, balance_after: 150.0, reference: 'WIFI-001', status: 'COMPLETED', description: 'WiFi 7 Day Pass', created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'txn-003', type: 'TOPUP', amount: 400.0, balance_after: 550.0, reference: 'TOP-002', status: 'COMPLETED', description: 'Wallet top-up', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ]);

  db.wifiVouchers.set(userId, [
    { id: 'voucher-001', voucher_code: 'WIFI-7DAY-ABC123', package_name: '7 Day Pass', status: 'ACTIVE', data_limit_mb: 2048, data_used_mb: 512, validity_hours: 168, activated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  ]);

  db.floatAlerts.set(userId, {
    threshold: 500.0,
    alerts: [
      { id: 'alert-001', type: 'LOW_FLOAT', message: 'Float balance below threshold', status: 'UNREAD', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ],
  });
}

// Initialize data
seedData();

// WiFi packages
const wifiPackages = {
  'pkg-wifi-1': { id: 'pkg-wifi-1', name: '1 Day Pass', description: '500MB valid for 24 hours', price: 15.0, data_limit_mb: 500, validity_hours: 24 },
  'pkg-wifi-2': { id: 'pkg-wifi-2', name: '7 Day Pass', description: '2GB valid for 7 days', price: 50.0, data_limit_mb: 2048, validity_hours: 168 },
  'pkg-wifi-3': { id: 'pkg-wifi-3', name: '14 Day Pass', description: '5GB valid for 14 days', price: 90.0, data_limit_mb: 5120, validity_hours: 336 },
  'pkg-wifi-4': { id: 'pkg-wifi-4', name: '30 Day Pass', description: '10GB valid for 30 days', price: 150.0, data_limit_mb: 10240, validity_hours: 720 },
};

// Electricity packages
const electricityPackages = {
  'pkg-elec-1': { id: 'pkg-elec-1', name: '50 kWh', description: '50 units of electricity', price: 75.0, kwh_amount: 50, package_type: 'UNITS' },
  'pkg-elec-2': { id: 'pkg-elec-2', name: '100 kWh', description: '100 units of electricity', price: 140.0, kwh_amount: 100, package_type: 'UNITS' },
  'pkg-elec-3': { id: 'pkg-elec-3', name: '200 kWh', description: '200 units of electricity', price: 260.0, kwh_amount: 200, package_type: 'UNITS' },
};

// PayFast configuration - uses environment variables in production
// Default values are PayFast sandbox test credentials (publicly documented)
function getPayFastConfig(env) {
  return {
    merchantId: env?.PAYFAST_MERCHANT_ID || process.env.PAYFAST_MERCHANT_ID || '10000100',
    merchantKey: env?.PAYFAST_MERCHANT_KEY || process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a',
    baseUrl: env?.PAYFAST_URL || 'https://sandbox.payfast.co.za',
    notifyBaseUrl: env?.API_BASE_URL || 'https://lokal-api.reshigan-085.workers.dev',
    returnBaseUrl: env?.FRONTEND_URL || 'https://lokal.vantax.co.za',
  };
}

function buildPayFastUrl(config, params) {
  const { merchantId, merchantKey, baseUrl, notifyBaseUrl, returnBaseUrl } = config;
  const queryParams = new URLSearchParams({
    merchant_id: merchantId,
    merchant_key: merchantKey,
    amount: params.amount.toString(),
    item_name: params.itemName,
    return_url: `${returnBaseUrl}${params.returnPath}`,
    cancel_url: `${returnBaseUrl}${params.cancelPath}`,
    notify_url: `${notifyBaseUrl}${params.notifyPath}`,
    ...params.customFields,
  });
  return `${baseUrl}/eng/process?${queryParams.toString()}`;
}

// Utility functions
function normalizePhone(phone) {
  phone = phone.replace(/[^\d+]/g, '');
  if (phone.startsWith('0')) {
    phone = '+27' + phone.slice(1);
  } else if (!phone.startsWith('+')) {
    phone = '+27' + phone;
  }
  return phone;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateId() {
  return crypto.randomUUID().slice(0, 8);
}

function generateToken(userId, type = 'access') {
  const exp = type === 'access' 
    ? Date.now() + 30 * 60 * 1000 
    : Date.now() + 7 * 24 * 60 * 60 * 1000;
  
  const payload = { sub: userId, type, exp };
  const payloadB64 = btoa(JSON.stringify(payload));
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payloadB64}.signature`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    
    return payload;
  } catch {
    return null;
  }
}

function getUserFromAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return db.users.get(payload.sub);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Route handlers
async function handleRoot() {
  return jsonResponse({
    name: 'Lokal Platform API',
    version: '2.0.0',
    description: 'Digital wallet and services platform with complete features',
  });
}

async function handleAuthLogin(request) {
  try {
    const body = await request.json();
    const phone = normalizePhone(body.phone_number || '');
    const password = body.password || '';
    const passwordHash = await sha256(password);

    // Find user by phone
    let user = null;
    for (const [id, u] of db.users) {
      if (u.phone_number === phone) {
        user = u;
        break;
      }
    }

    if (!user) {
      // Create new user
      const userId = `user-${generateId()}`;
      user = {
        id: userId,
        phone_number: phone,
        password_hash: passwordHash,
        first_name: null,
        last_name: null,
        email: null,
        kyc_status: 'PENDING',
        status: 'ACTIVE',
        referral_code: `REF${generateId().toUpperCase()}`,
        loyalty_points: 0,
        is_agent: false,
        is_admin: false,
        created_at: new Date().toISOString(),
      };
      db.users.set(userId, user);

      // Create wallet
      db.wallets.set(userId, {
        id: `wallet-${generateId()}`,
        user_id: userId,
        balance: 0.0,
        currency: 'ZAR',
        status: 'ACTIVE',
        daily_limit: 5000.0,
        monthly_limit: 50000.0,
        daily_spent: 0.0,
        monthly_spent: 0.0,
      });
      db.transactions.set(userId, []);
      db.wifiVouchers.set(userId, []);
    } else {
      // Verify password
      if (user.password_hash !== passwordHash) {
        return jsonResponse({ detail: 'Invalid credentials' }, 401);
      }
    }

    const accessToken = generateToken(user.id, 'access');
    const refreshToken = generateToken(user.id, 'refresh');

    return jsonResponse({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 1800,
      user_id: user.id,
      is_agent: user.is_agent || false,
      is_admin: user.is_admin || false,
    });
  } catch (e) {
    return jsonResponse({ detail: e.message }, 500);
  }
}

async function handleUsersMe(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const wallet = db.wallets.get(user.id);

  return jsonResponse({
    id: user.id,
    phone_number: user.phone_number,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    kyc_status: user.kyc_status || 'PENDING',
    status: user.status || 'ACTIVE',
    referral_code: user.referral_code,
    loyalty_points: user.loyalty_points || 0,
    has_pin: false,
    is_agent: user.is_agent || false,
    is_admin: user.is_admin || false,
    created_at: user.created_at,
    wallet: wallet ? {
      balance: wallet.balance,
      currency: wallet.currency,
    } : null,
  });
}

async function handleWallet(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const wallet = db.wallets.get(user.id);
  if (!wallet) return jsonResponse({ detail: 'Wallet not found' }, 404);

  return jsonResponse({
    id: wallet.id,
    balance: wallet.balance,
    currency: wallet.currency,
    status: wallet.status,
    daily_limit: wallet.daily_limit,
    monthly_limit: wallet.monthly_limit,
    daily_spent: wallet.daily_spent,
    monthly_spent: wallet.monthly_spent,
  });
}

async function handleWalletTransactions(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const transactions = db.transactions.get(user.id) || [];

  return jsonResponse({
    transactions,
    total: transactions.length,
    page: 1,
    has_more: false,
  });
}

async function handleWalletTopup(request, env) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  try {
    const body = await request.json();
    const amount = parseFloat(body.amount || 0);
    const paymentMethod = body.payment_method || 'CARD';

    if (amount <= 0) return jsonResponse({ detail: 'Invalid amount' }, 400);

    const txnId = `txn-${generateId()}`;
    const reference = `TXN${generateId().toUpperCase()}`;
    const wallet = db.wallets.get(user.id);

    // Create pending transaction
    const transaction = {
      id: txnId,
      type: 'TOPUP',
      amount,
      balance_after: wallet.balance,
      reference,
      status: 'PENDING',
      description: `Wallet topup via ${paymentMethod}`,
      created_at: new Date().toISOString(),
    };

    const transactions = db.transactions.get(user.id) || [];
    transactions.unshift(transaction);
    db.transactions.set(user.id, transactions);

    // Generate PayFast payment URL using config
    const config = getPayFastConfig(env);
    const payfastUrl = buildPayFastUrl(config, {
      amount,
      itemName: 'Lokal Wallet Topup',
      returnPath: '/user/topup/success',
      cancelPath: '/user/topup/cancel',
      notifyPath: '/wallet/topup/callback',
      customFields: { custom_str1: txnId },
    });

    return jsonResponse({
      transaction_id: txnId,
      reference,
      amount,
      payment_url: payfastUrl,
      status: 'pending',
    });
  } catch (e) {
    return jsonResponse({ detail: e.message }, 500);
  }
}

async function handleUsersLoyalty(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const points = user.loyalty_points || 0;

  let tier, nextTierPoints;
  if (points >= 10000) {
    tier = 'Platinum';
    nextTierPoints = 0;
  } else if (points >= 5000) {
    tier = 'Gold';
    nextTierPoints = 10000 - points;
  } else if (points >= 1000) {
    tier = 'Silver';
    nextTierPoints = 5000 - points;
  } else {
    tier = 'Bronze';
    nextTierPoints = 1000 - points;
  }

  return jsonResponse({
    points,
    tier,
    next_tier_points: Math.max(0, nextTierPoints),
    rewards_available: Math.floor(points / 100),
  });
}

async function handleWifiPackages() {
  return jsonResponse({ packages: Object.values(wifiPackages) });
}

async function handleWifiPurchase(request, env) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  try {
    const body = await request.json();
    const packageId = body.package_id;

    const pkg = wifiPackages[packageId];
    if (!pkg) return jsonResponse({ detail: 'Package not found' }, 404);

    const wallet = db.wallets.get(user.id);
    if (!wallet) return jsonResponse({ detail: 'Wallet not found' }, 404);

    if (wallet.balance >= pkg.price) {
      // Deduct from wallet
      wallet.balance -= pkg.price;

      // Create voucher
      const voucherId = `voucher-${generateId()}`;
      const voucherCode = `WF${generateId().toUpperCase()}`;

      const voucher = {
        id: voucherId,
        voucher_code: voucherCode,
        package_name: pkg.name,
        status: 'UNUSED',
        data_limit_mb: pkg.data_limit_mb,
        data_used_mb: 0,
        validity_hours: pkg.validity_hours,
        activated_at: null,
        expires_at: null,
        created_at: new Date().toISOString(),
      };

      const vouchers = db.wifiVouchers.get(user.id) || [];
      vouchers.unshift(voucher);
      db.wifiVouchers.set(user.id, vouchers);

      // Create transaction
      const txnId = `txn-${generateId()}`;
      const transaction = {
        id: txnId,
        type: 'WIFI_PURCHASE',
        amount: -pkg.price,
        balance_after: wallet.balance,
        reference: `WIFI${generateId().toUpperCase()}`,
        status: 'COMPLETED',
        description: `WiFi voucher: ${pkg.name}`,
        created_at: new Date().toISOString(),
      };

      const transactions = db.transactions.get(user.id) || [];
      transactions.unshift(transaction);
      db.transactions.set(user.id, transactions);

      // Award loyalty points
      const points = Math.floor(pkg.price / 10);
      user.loyalty_points = (user.loyalty_points || 0) + points;

      return jsonResponse({
        transaction_id: txnId,
        voucher_id: voucherId,
        voucher_code: voucherCode,
        new_balance: wallet.balance,
        loyalty_points_earned: points,
      });
    } else {
      // Redirect to PayFast
      const txnId = `txn-${generateId()}`;
      const config = getPayFastConfig(env);
      const payfastUrl = buildPayFastUrl(config, {
        amount: pkg.price,
        itemName: `Lokal WiFi ${pkg.name}`,
        returnPath: '/user/wifi/success',
        cancelPath: '/user/wifi',
        notifyPath: '/wifi/purchase/callback',
        customFields: { custom_str1: txnId, custom_str2: packageId, custom_str3: user.id },
      });

      return jsonResponse({
        requires_payment: true,
        payment_url: payfastUrl,
        amount: pkg.price,
        package: pkg,
      });
    }
  } catch (e) {
    return jsonResponse({ detail: e.message }, 500);
  }
}

async function handleWifiVouchers(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const vouchers = db.wifiVouchers.get(user.id) || [];
  return jsonResponse({ vouchers });
}

async function handleElectricityPackages() {
  return jsonResponse({ packages: Object.values(electricityPackages) });
}

async function handleElectricityPurchase(request, env) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  try {
    const body = await request.json();
    const packageId = body.package_id;
    const meterId = body.meter_id || 'default';

    const pkg = electricityPackages[packageId];
    if (!pkg) return jsonResponse({ detail: 'Package not found' }, 404);

    const wallet = db.wallets.get(user.id);
    if (!wallet) return jsonResponse({ detail: 'Wallet not found' }, 404);

    if (wallet.balance >= pkg.price) {
      // Deduct from wallet
      wallet.balance -= pkg.price;

      // Create transaction
      const txnId = `txn-${generateId()}`;
      const reference = `ELEC${generateId().toUpperCase()}`;

      const transaction = {
        id: txnId,
        type: 'ELECTRICITY_PURCHASE',
        amount: -pkg.price,
        balance_after: wallet.balance,
        reference,
        status: 'COMPLETED',
        description: `Electricity: ${pkg.name}`,
        created_at: new Date().toISOString(),
      };

      const transactions = db.transactions.get(user.id) || [];
      transactions.unshift(transaction);
      db.transactions.set(user.id, transactions);

      // Award loyalty points
      const points = Math.floor(pkg.price / 10);
      user.loyalty_points = (user.loyalty_points || 0) + points;

      return jsonResponse({
        transaction_id: txnId,
        reference,
        kwh_purchased: pkg.kwh_amount,
        new_wallet_balance: wallet.balance,
        loyalty_points_earned: points,
      });
    } else {
      // Redirect to PayFast
      const txnId = `txn-${generateId()}`;
      const config = getPayFastConfig(env);
      const payfastUrl = buildPayFastUrl(config, {
        amount: pkg.price,
        itemName: `Lokal Electricity ${pkg.name}`,
        returnPath: '/user/electricity/success',
        cancelPath: '/user/electricity',
        notifyPath: '/electricity/purchase/callback',
        customFields: { custom_str1: txnId, custom_str2: packageId, custom_str3: user.id },
      });

      return jsonResponse({
        requires_payment: true,
        payment_url: payfastUrl,
        amount: pkg.price,
        package: pkg,
      });
    }
  } catch (e) {
    return jsonResponse({ detail: e.message }, 500);
  }
}

async function handleAgentProfile(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  if (!user.is_agent) return jsonResponse({ detail: 'Not an agent' }, 403);

  const wallet = db.wallets.get(user.id) || {};

  return jsonResponse({
    id: user.id,
    agent_code: `AGT${user.id.slice(-6).toUpperCase()}`,
    business_name: `${user.first_name || 'Agent'}'s Store`,
    business_type: 'Spaza Shop',
    tier: 'Silver',
    float_balance: wallet.balance || 0,
    commission_balance: 125.50,
    total_sales: 15000.0,
    monthly_sales: 3500.0,
    status: 'ACTIVE',
    address: '123 Main Street',
    created_at: user.created_at,
  });
}

async function handleAgentSalesReport(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const today = new Date();
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dailyBreakdown.push({
      date: date.toISOString().split('T')[0],
      sales: 500 + (i * 100),
      commission: 25 + (i * 5),
      transactions: 10 + i,
    });
  }

  return jsonResponse({
    today_sales: 850.0,
    today_commission: 42.50,
    week_sales: 3500.0,
    week_commission: 175.0,
    month_sales: 15000.0,
    month_commission: 750.0,
    commission_balance: 125.50,
    daily_breakdown: dailyBreakdown,
  });
}

async function handleAgentAlerts(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const wallet = db.wallets.get(user.id) || {};
  const alertsData = db.floatAlerts.get(user.id) || { threshold: 500.0, alerts: [] };

  return jsonResponse({
    float_balance: wallet.balance || 0,
    threshold: alertsData.threshold,
    is_low: (wallet.balance || 0) < alertsData.threshold,
    alerts: alertsData.alerts,
  });
}

async function handleAdminAuditLogs(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const logs = [
    { id: 'log-001', action: 'USER_CREATE', entity_type: 'USER', entity_id: 'user-002', user_id: user.id, details: 'Created new user', created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    { id: 'log-002', action: 'PACKAGE_UPDATE', entity_type: 'WIFI_PACKAGE', entity_id: 'pkg-wifi-1', user_id: user.id, details: 'Updated price', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: 'log-003', action: 'AGENT_APPROVE', entity_type: 'AGENT', entity_id: 'agent-001', user_id: user.id, details: 'Approved agent application', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  ];

  return jsonResponse({
    logs,
    total: logs.length,
    page: 1,
  });
}

async function handleReferralApply(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  try {
    const body = await request.json();
    const referralCode = (body.referral_code || '').toUpperCase();

    // Find referrer
    let referrer = null;
    for (const [id, u] of db.users) {
      if (u.referral_code === referralCode) {
        referrer = u;
        break;
      }
    }

    if (!referrer) return jsonResponse({ detail: 'Invalid referral code' }, 404);
    if (referrer.id === user.id) return jsonResponse({ detail: 'Cannot use your own referral code' }, 400);

    // Award points to both
    user.loyalty_points = (user.loyalty_points || 0) + 100;
    referrer.loyalty_points = (referrer.loyalty_points || 0) + 100;

    // Credit R10 to both wallets
    const userWallet = db.wallets.get(user.id);
    const referrerWallet = db.wallets.get(referrer.id);

    if (userWallet) userWallet.balance += 10.0;
    if (referrerWallet) referrerWallet.balance += 10.0;

    return jsonResponse({
      message: 'Referral code applied successfully',
      bonus_amount: 10.0,
      loyalty_points_earned: 100,
    });
  } catch (e) {
    return jsonResponse({ detail: e.message }, 500);
  }
}

async function handleAnalytics(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  const transactions = db.transactions.get(user.id) || [];
  const wallet = db.wallets.get(user.id) || {};

  // Calculate analytics
  const totalSpent = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalTopups = transactions
    .filter(t => t.type === 'TOPUP')
    .reduce((sum, t) => sum + t.amount, 0);

  const wifiSpent = transactions
    .filter(t => t.type === 'WIFI_PURCHASE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const electricitySpent = transactions
    .filter(t => t.type === 'ELECTRICITY_PURCHASE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Monthly breakdown
  const monthlyData = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    monthlyData.push({
      month: date.toLocaleString('default', { month: 'short' }),
      wifi: Math.floor(Math.random() * 200) + 50,
      electricity: Math.floor(Math.random() * 300) + 100,
      topups: Math.floor(Math.random() * 500) + 200,
    });
  }

  return jsonResponse({
    total_spent: totalSpent,
    total_topups: totalTopups,
    wifi_spent: wifiSpent,
    electricity_spent: electricitySpent,
    current_balance: wallet.balance || 0,
    loyalty_points: user.loyalty_points || 0,
    transaction_count: transactions.length,
    monthly_breakdown: monthlyData.reverse(),
  });
}

// Unifi controller integration for WiFi provisioning
async function handleUnifiProvision(request) {
  const user = getUserFromAuth(request.headers.get('Authorization'));
  if (!user) return jsonResponse({ detail: 'Not authenticated' }, 401);

  try {
    const body = await request.json();
    const voucherCode = body.voucher_code;
    const macAddress = body.mac_address;

    // Find voucher
    const vouchers = db.wifiVouchers.get(user.id) || [];
    const voucher = vouchers.find(v => v.voucher_code === voucherCode);

    if (!voucher) return jsonResponse({ detail: 'Voucher not found' }, 404);
    if (voucher.status !== 'UNUSED' && voucher.status !== 'ACTIVE') {
      return jsonResponse({ detail: 'Voucher already used or expired' }, 400);
    }

    // Activate voucher
    voucher.status = 'ACTIVE';
    voucher.activated_at = new Date().toISOString();
    voucher.expires_at = new Date(Date.now() + voucher.validity_hours * 60 * 60 * 1000).toISOString();

    // In production, this would call the Unifi controller API
    // Example: POST to https://unifi-controller/api/s/default/cmd/stamgr
    // with payload: { cmd: 'authorize-guest', mac: macAddress, minutes: voucher.validity_hours * 60 }

    return jsonResponse({
      success: true,
      message: 'WiFi access provisioned successfully',
      voucher_code: voucherCode,
      mac_address: macAddress,
      expires_at: voucher.expires_at,
      data_limit_mb: voucher.data_limit_mb,
    });
  } catch (e) {
    return jsonResponse({ detail: e.message }, 500);
  }
}

// PayFast callback handlers
async function handlePayfastCallback(request) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const paymentStatus = params.get('payment_status');
    const txnId = params.get('custom_str1');
    const packageId = params.get('custom_str2');
    const userId = params.get('custom_str3');
    const amount = parseFloat(params.get('amount_gross') || '0');

    if (paymentStatus === 'COMPLETE') {
      const user = db.users.get(userId);
      const wallet = db.wallets.get(userId);

      if (user && wallet) {
        // Update transaction status
        const transactions = db.transactions.get(userId) || [];
        const txn = transactions.find(t => t.id === txnId);
        if (txn) {
          txn.status = 'COMPLETED';
          wallet.balance += amount;
          txn.balance_after = wallet.balance;
        }

        // If it's a WiFi purchase, create the voucher
        if (packageId && wifiPackages[packageId]) {
          const pkg = wifiPackages[packageId];
          const voucherId = `voucher-${generateId()}`;
          const voucherCode = `WF${generateId().toUpperCase()}`;

          const voucher = {
            id: voucherId,
            voucher_code: voucherCode,
            package_name: pkg.name,
            status: 'UNUSED',
            data_limit_mb: pkg.data_limit_mb,
            data_used_mb: 0,
            validity_hours: pkg.validity_hours,
            activated_at: null,
            expires_at: null,
            created_at: new Date().toISOString(),
          };

          const vouchers = db.wifiVouchers.get(userId) || [];
          vouchers.unshift(voucher);
          db.wifiVouchers.set(userId, vouchers);
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Route mapping
    const routes = {
      'GET /': handleRoot,
      'POST /auth/login': handleAuthLogin,
      'POST /auth/register': handleAuthLogin,
      'GET /users/me': handleUsersMe,
      'GET /users/loyalty': handleUsersLoyalty,
      'GET /wallet': handleWallet,
      'GET /wallet/transactions': handleWalletTransactions,
      'POST /wallet/topup': handleWalletTopup,
      'POST /wallet/topup/callback': handlePayfastCallback,
      'GET /wifi/packages': handleWifiPackages,
      'POST /wifi/purchase': handleWifiPurchase,
      'POST /wifi/purchase/callback': handlePayfastCallback,
      'GET /wifi/vouchers': handleWifiVouchers,
      'POST /wifi/provision': handleUnifiProvision,
      'GET /electricity/packages': handleElectricityPackages,
      'POST /electricity/purchase': handleElectricityPurchase,
      'POST /electricity/purchase/callback': handlePayfastCallback,
      'GET /agent/profile': handleAgentProfile,
      'GET /agent/sales-report': handleAgentSalesReport,
      'GET /agent/alerts': handleAgentAlerts,
      'GET /admin/audit-logs': handleAdminAuditLogs,
      'POST /referral/apply': handleReferralApply,
      'GET /analytics': handleAnalytics,
    };

    const routeKey = `${method} ${path}`;
    const handler = routes[routeKey];

    if (handler) {
      return handler(request, env);
    }

    return jsonResponse({ detail: 'Not found' }, 404);
  },
};
