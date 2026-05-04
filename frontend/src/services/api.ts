const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://lokal-api.reshigan-085.workers.dev';
// Cloudflare Worker (D1-backed) is the canonical backend.
// Dev: VITE_API_URL=http://localhost:8787 (default for `wrangler dev`)
// Prod: deploy the worker via `cd backend-cloudflare && wrangler deploy` and set
//        VITE_API_URL accordingly when building the frontend.

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('access_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `Error: ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  }

  // Auth endpoints - Phone + Password
  async registerWithPassword(phone_number: string, password: string, first_name?: string, last_name?: string) {
    return this.request<{
      message: string;
      access_token: string;
      refresh_token: string;
      user_id: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone_number, password, first_name, last_name }),
    });
  }

  async loginWithPassword(phone_number: string, password: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      user_id: string;
      is_agent: boolean;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone_number, password }),
    });
  }

  // Legacy OTP endpoints (kept for backward compatibility)
  async requestOTP(phone_number: string) {
    return this.request<{ message: string; debug_otp?: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone_number }),
    });
  }

  async verifyOTP(phone_number: string, code: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      user_id: string;
      is_new_user: boolean;
    }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone_number, otp_code: code }),
    });
  }

  async loginWithPIN(phone_number: string, pin: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      user_id: string;
    }>('/auth/pin/login', {
      method: 'POST',
      body: JSON.stringify({ phone_number, pin }),
    });
  }

  async setPIN(pin: string, confirm_pin: string) {
    return this.request<{ message: string }>('/auth/pin/set', {
      method: 'POST',
      body: JSON.stringify({ pin, confirm_pin }),
    });
  }

  async logout() {
    const result = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    this.setToken(null);
    localStorage.removeItem('refresh_token');
    return result;
  }

  // User endpoints
  async getProfile() {
    return this.request<{
      id: string;
      phone_number: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      kyc_status: string;
      status: string;
      referral_code: string | null;
      loyalty_points: number;
      has_pin: boolean;
      created_at: string;
    }>('/users/me');
  }

  async updateProfile(data: { first_name?: string; last_name?: string; email?: string }) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getLoyalty() {
    return this.request<{
      points: number;
      tier: string;
      next_tier_points: number;
      rewards_available: number;
    }>('/users/loyalty');
  }

  // Wallet endpoints
  async getWallet() {
    return this.request<{
      id: string;
      balance: number;
      currency: string;
      status: string;
      daily_limit: number;
      monthly_limit: number;
      daily_spent: number;
      monthly_spent: number;
    }>('/wallet');
  }

  async initiateTopup(amount: number, payment_method: string) {
    return this.request<{
      transaction_id: string;
      reference: string;
      payment_url: string;
    }>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method }),
    });
  }

  async getTransactions(page = 1, page_size = 20) {
    return this.request<{
      transactions: Array<{
        id: string;
        type: string;
        amount: number;
        fee: number;
        balance_before: number;
        balance_after: number;
        reference: string;
        status: string;
        description: string | null;
        created_at: string;
      }>;
      total: number;
      page: number;
      has_more: boolean;
    }>(`/wallet/transactions?page=${page}&page_size=${page_size}`);
  }

  async transfer(recipient_phone: string, amount: number, description?: string) {
    return this.request<{
      transaction_id: string;
      reference: string;
      new_balance: number;
    }>('/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify({ recipient_phone, amount, description }),
    });
  }

  // WiFi endpoints
  async getWiFiPackages() {
    return this.request<{
      packages: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        data_limit_mb: number;
        validity_hours: number;
      }>;
    }>('/wifi/packages');
  }

  async purchaseWiFi(package_id: string) {
    return this.request<{
      transaction_id: string;
      voucher_id: string;
      voucher_code: string;
      new_balance: number;
    }>('/wifi/purchase', {
      method: 'POST',
      body: JSON.stringify({ package_id }),
    });
  }

  async getWiFiVouchers() {
    return this.request<{
      vouchers: Array<{
        id: string;
        package_name: string;
        voucher_code: string;
        status: string;
        data_limit_mb: number;
        data_used_mb: number;
        data_remaining_mb: number;
        validity_hours: number;
        activated_at: string | null;
        expires_at: string | null;
        created_at: string;
      }>;
    }>('/wifi/vouchers');
  }

  async activateVoucher(voucher_id: string) {
    return this.request<{
      message: string;
      voucher_code: string;
      expires_at: string;
    }>(`/wifi/vouchers/${voucher_id}/activate`, {
      method: 'POST',
    });
  }

  // Electricity endpoints
  async getElectricityPackages() {
    return this.request<{
      packages: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        package_type: string;
        kwh_amount: number | null;
        validity_days: number | null;
      }>;
    }>('/electricity/packages');
  }

  async purchaseElectricity(package_id: string, meter_id: string) {
    return this.request<{
      transaction_id: string;
      reference: string;
      kwh_purchased: number;
      new_kwh_balance: number;
      new_wallet_balance: number;
    }>('/electricity/purchase', {
      method: 'POST',
      body: JSON.stringify({ package_id, meter_id }),
    });
  }

  async getMeters() {
    return this.request<{
      meters: Array<{
        id: string;
        meter_number: string;
        address: string | null;
        kwh_balance: number;
        status: string;
        unlimited_expires_at: string | null;
      }>;
    }>('/electricity/meters');
  }

  async registerMeter(meter_number: string, address?: string) {
    return this.request<{
      message: string;
      meter_id: string;
    }>(`/electricity/meters/register?meter_number=${meter_number}${address ? `&address=${encodeURIComponent(address)}` : ''}`, {
      method: 'POST',
    });
  }

  // Agent endpoints
  async registerAgent(data: {
    business_name: string;
    business_type: string;
    address?: string;
    initial_float: number;
  }) {
    return this.request<{
      message: string;
      agent_code: string;
      status: string;
      float_balance: number;
    }>('/agent/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentProfile() {
    return this.request<{
      id: string;
      agent_code: string;
      business_name: string;
      business_type: string;
      tier: string;
      float_balance: number;
      commission_balance: number;
      total_sales: number;
      monthly_sales: number;
      status: string;
      address: string | null;
      created_at: string;
    }>('/agent/profile');
  }

  async getAgentFloat() {
    return this.request<{
      float_balance: number;
      low_float_threshold: number;
      is_low: boolean;
    }>('/agent/float');
  }

  async topupFloat(amount: number, payment_method: string) {
    return this.request<{
      message: string;
      new_balance: number;
    }>('/agent/float/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method }),
    });
  }

  async processAgentTransaction(data: {
    customer_phone: string;
    product_type: string;
    package_id: string;
    meter_id?: string;
    cash_received: number;
  }) {
    return this.request<{
      transaction_id: string;
      reference: string;
      voucher_code?: string;
      amount: number;
      commission_earned: number;
      new_float_balance: number;
    }>('/agent/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentCommissions() {
    return this.request<{
      balance: number;
      pending: number;
      total_earned: number;
      transactions: Array<{
        id: string;
        amount: number;
        commission: number;
        description: string;
        created_at: string;
      }>;
    }>('/agent/commissions');
  }

  async withdrawCommission(amount: number, withdrawal_method: string) {
    return this.request<{
      message: string;
      new_commission_balance: number;
    }>('/agent/commissions/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, withdrawal_method }),
    });
  }

  async searchCustomers(phone?: string, name?: string) {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (name) params.append('name', name);
    return this.request<Array<{
      id: string;
      phone_number: string;
      first_name: string | null;
      last_name: string | null;
      kyc_status: string;
    }>>(`/agent/customers/search?${params.toString()}`);
  }

  async registerCustomer(phone_number: string, first_name: string, last_name?: string) {
    return this.request<{
      message: string;
      customer_id: string;
      referral_bonus_earned: number;
    }>('/agent/customers', {
      method: 'POST',
      body: JSON.stringify({ phone_number, first_name, last_name }),
    });
  }

  // Admin endpoints
  async getAdminDashboardStats() {
    return this.request<{
      users: { total: number; new_30_days: number; verified: number };
      agents: { active: number };
      revenue: { total: number; last_30_days: number };
      wallets: { total_balance: number };
    }>('/admin/dashboard/stats');
  }

  async getAdminUsers(page = 1, search?: string, kyc_status?: string) {
    const params = new URLSearchParams({ page: page.toString(), page_size: '20' });
    if (search) params.append('search', search);
    if (kyc_status) params.append('kyc_status', kyc_status);
    return this.request<{
      users: Array<{
        id: string;
        phone_number: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        kyc_status: string;
        status: string;
        loyalty_points: number;
        created_at: string;
      }>;
      total: number;
      page: number;
    }>(`/admin/users?${params.toString()}`);
  }

  async getAdminAgents(page = 1, tier?: string, status?: string) {
    const params = new URLSearchParams({ page: page.toString(), page_size: '20' });
    if (tier) params.append('tier', tier);
    if (status) params.append('agent_status', status);
    return this.request<{
      agents: Array<{
        id: string;
        agent_code: string;
        business_name: string;
        business_type: string;
        tier: string;
        float_balance: number;
        commission_balance: number;
        total_sales: number;
        monthly_sales: number;
        status: string;
        user_phone: string;
        user_name: string;
        created_at: string;
      }>;
      total: number;
      page: number;
    }>(`/admin/agents?${params.toString()}`);
  }

  async updateUserStatus(user_id: string, status: string) {
    return this.request<{ message: string }>(`/admin/users/${user_id}/status?new_status=${status}`, {
      method: 'PUT',
    });
  }

  async updateUserKYC(user_id: string, status: string) {
    return this.request<{ message: string }>(`/admin/users/${user_id}/kyc?new_status=${status}`, {
      method: 'PUT',
    });
  }

  async updateAgentTier(agent_id: string, tier: string) {
    return this.request<{ message: string }>(`/admin/agents/${agent_id}/tier?new_tier=${tier}`, {
      method: 'PUT',
    });
  }

  async getAdminWiFiPackages() {
    return this.request<Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      data_limit_mb: number;
      validity_hours: number;
      is_active: boolean;
      sort_order: number;
    }>>('/admin/products/wifi');
  }

  async getAdminElectricityPackages() {
    return this.request<Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      kwh_amount: number;
      is_active: boolean;
      sort_order: number;
    }>>('/admin/products/electricity');
  }

  async getRevenueReport(days = 30) {
    return this.request<{
      period_days: number;
      daily_revenue: Array<{ date: string; amount: number }>;
      by_product: { wifi: number; electricity: number; other: number };
      total: number;
    }>(`/admin/reports/revenue?days=${days}`);
  }

  async getAgentPerformanceReport(days = 30) {
    return this.request<{
      period_days: number;
      top_agents: Array<{
        agent_code: string;
        business_name: string;
        tier: string;
        total_sales: number;
        monthly_sales: number;
        commission_balance: number;
      }>;
    }>(`/admin/reports/agents?days=${days}`);
  }

  // Admin Settings - Payment Gateways
  async getPaymentGateways() {
    return this.request<Array<{
      id: string;
      name: string;
      type: string;
      is_active: boolean;
      merchant_id?: string;
      api_key?: string;
      environment: string;
    }>>('/admin/settings/payment-gateways');
  }

  async createPaymentGateway(data: {
    name: string;
    type: string;
    is_active: boolean;
    merchant_id?: string;
    api_key?: string;
    environment: string;
  }) {
    return this.request('/admin/settings/payment-gateways', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePaymentGateway(id: string, data: {
    name?: string;
    type?: string;
    is_active?: boolean;
    merchant_id?: string;
    api_key?: string;
    environment?: string;
  }) {
    return this.request(`/admin/settings/payment-gateways/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePaymentGateway(id: string) {
    return this.request(`/admin/settings/payment-gateways/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin Settings - Bank Accounts
  async getBankAccounts() {
    return this.request<Array<{
      id: string;
      bank_name: string;
      account_name: string;
      account_number: string;
      branch_code: string;
      account_type: string;
      is_primary: boolean;
    }>>('/admin/settings/bank-accounts');
  }

  async createBankAccount(data: {
    bank_name: string;
    account_name: string;
    account_number: string;
    branch_code: string;
    account_type: string;
    is_primary: boolean;
  }) {
    return this.request('/admin/settings/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBankAccount(id: string, data: {
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    branch_code?: string;
    account_type?: string;
    is_primary?: boolean;
  }) {
    return this.request(`/admin/settings/bank-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBankAccount(id: string) {
    return this.request(`/admin/settings/bank-accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin Settings - IoT Devices
  async getIoTDevices() {
    return this.request<Array<{
      id: string;
      name: string;
      device_type: string;
      serial_number: string;
      ip_address?: string;
      status: string;
      last_seen?: string;
      location?: string;
    }>>('/admin/settings/iot-devices');
  }

  async createIoTDevice(data: {
    name: string;
    device_type: string;
    serial_number: string;
    ip_address?: string;
    location?: string;
  }) {
    return this.request('/admin/settings/iot-devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIoTDevice(id: string, data: {
    name?: string;
    device_type?: string;
    serial_number?: string;
    ip_address?: string;
    location?: string;
  }) {
    return this.request(`/admin/settings/iot-devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIoTDevice(id: string) {
    return this.request(`/admin/settings/iot-devices/${id}`, {
      method: 'DELETE',
    });
  }

  // ============== NEW FEATURE ENDPOINTS ==============

  // Transaction Receipt
  async getTransactionReceipt(transactionId: string) {
    return this.request<{
      receipt: {
        receipt_number: string;
        date: string;
        customer_name: string;
        customer_phone: string;
        transaction_type: string;
        description: string;
        amount: number;
        fee: number;
        total: number;
        balance_after: number;
        status: string;
        payment_method: string;
        platform: string;
        support_email: string;
        support_phone: string;
      };
    }>(`/transactions/${transactionId}/receipt`);
  }

  // Referral System
  async applyReferralCode(referral_code: string) {
    return this.request<{
      message: string;
      points_earned: number;
      referrer_points_earned: number;
    }>('/referrals/apply', {
      method: 'POST',
      body: JSON.stringify({ referral_code }),
    });
  }

  async getReferralStats() {
    return this.request<{
      referral_code: string | null;
      total_referrals: number;
      total_rewards_earned: number;
      loyalty_points: number;
      reward_per_referral: number;
      points_per_referral: number;
    }>('/referrals/stats');
  }

  // Admin Analytics
  async getAdminAnalytics() {
    return this.request<{
      total_users: number;
      total_agents: number;
      active_agents: number;
      total_transactions: number;
      total_revenue: number;
      today_new_users: number;
      today_transactions: number;
      today_revenue: number;
    }>('/admin/analytics');
  }

  async getAdminRevenueAnalytics() {
    return this.request<{
      daily_revenue: Array<{
        date: string;
        revenue: number;
        transactions: number;
      }>;
      revenue_by_product: {
        wifi: number;
        electricity: number;
      };
    }>('/admin/analytics/revenue');
  }

  // Admin Audit Logs
  async getAdminAuditLogs() {
    return this.request<{
      audit_logs: Array<{
        id: string;
        user_id: string | null;
        user_phone: string | null;
        user_name: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        old_value: string | null;
        new_value: string | null;
        created_at: string;
      }>;
    }>('/admin/audit-logs');
  }

  // Admin Bulk Operations
  async exportUsers() {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/admin/users/export`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.blob();
  }

  async importUsers(users: Array<{
    phone_number: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }>) {
    return this.request<{
      imported: number;
      errors: Array<{ phone?: string; error: string }>;
    }>('/admin/users/import', {
      method: 'POST',
      body: JSON.stringify({ users }),
    });
  }

  async exportAgents() {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/admin/agents/export`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.blob();
  }

  // Agent Sales Reports
  async getAgentSalesReport() {
    return this.request<{
      today: { sales: number; count: number; commission: number };
      week: { sales: number; count: number };
      month: { sales: number; count: number; commission: number };
      daily_breakdown: Array<{ date: string; sales: number; count: number }>;
      total_sales: number;
      commission_balance: number;
    }>('/agent/sales/report');
  }

  async exportAgentSales() {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/agent/sales/export`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.blob();
  }

  // Agent Customer Management
  async getAgentCustomers() {
    return this.request<{
      customers: Array<{
        id: string;
        customer_id: string;
        customer_phone: string;
        customer_name: string | null;
        notes: string | null;
        total_purchases: number;
        last_purchase_at: string | null;
        created_at: string;
      }>;
    }>('/agent/customers');
  }

  async addAgentCustomer(data: {
    customer_phone: string;
    customer_name?: string;
    notes?: string;
  }) {
    return this.request<{
      message: string;
      customer_id: string;
    }>('/agent/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentCustomerDetail(customerId: string) {
    return this.request<{
      customer: {
        id: string;
        customer_phone: string;
        customer_name: string | null;
        notes: string | null;
        total_purchases: number;
        last_purchase_at: string | null;
      };
      purchase_history: Array<{
        id: string;
        product_type: string;
        product_name: string;
        amount: number;
        created_at: string;
      }>;
    }>(`/agent/customers/${customerId}`);
  }

    // User Analytics
    async getAnalytics() {
      return this.request<{
        total_spent: number;
        total_topups: number;
        wifi_spent: number;
        electricity_spent: number;
        current_balance: number;
        loyalty_points: number;
        transaction_count: number;
        monthly_breakdown: Array<{
          month: string;
          wifi: number;
          electricity: number;
          topups: number;
        }>;
      }>('/analytics');
    }

    // Agent Float Alerts
    async getAgentAlerts() {
    return this.request<{
      alerts: Array<{
        id: string;
        alert_type: string;
        threshold: number | null;
        current_balance: number | null;
        message: string | null;
        is_read: boolean;
        created_at: string;
      }>;
      current_float: number;
      low_float_threshold: number;
      is_low: boolean;
    }>('/agent/alerts');
  }

  async updateAgentAlertSettings(low_float_threshold: number) {
    return this.request<{
      message: string;
      low_float_threshold: number;
    }>('/agent/alerts/settings', {
      method: 'PUT',
      body: JSON.stringify({ low_float_threshold }),
    });
  }

  // ============ Tariffs ============
  async listTariffs() {
    return this.request<Tariff[]>('/tariffs/');
  }

  async getTariff(id: string) {
    return this.request<Tariff>(`/tariffs/${id}`);
  }

  async createTariff(payload: TariffCreate) {
    return this.request<Tariff>('/tariffs/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async deactivateTariff(id: string) {
    return this.request<void>(`/tariffs/${id}`, { method: 'DELETE' });
  }

  // ============ Community offices ============
  async listCommunityOffices() {
    return this.request<CommunityOffice[]>('/community-offices/');
  }

  async createCommunityOffice(payload: CommunityOfficeCreate) {
    return this.request<CommunityOffice>('/community-offices/', { method: 'POST', body: JSON.stringify(payload) });
  }

  // ============ Households ============
  async listHouseholds(q?: string, mineOnly: boolean = false) {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (mineOnly) qs.set('mine_only', 'true');
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<Household[]>(`/households/${suffix}`);
  }

  async myHouseholds() {
    return this.request<Household[]>('/households/mine');
  }

  async getHousehold(id: string) {
    return this.request<Household>(`/households/${id}`);
  }

  async createHousehold(payload: HouseholdCreate) {
    return this.request<Household>('/households/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateHousehold(id: string, payload: Partial<HouseholdCreate> & { status?: string }) {
    return this.request<Household>(`/households/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  // ============ Billing / readings / invoices ============
  async captureReading(payload: MeterReadingCreate) {
    return this.request<Invoice>('/billing/readings', { method: 'POST', body: JSON.stringify(payload) });
  }

  async listInvoices(params: { household_id?: string; status?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.household_id) qs.set('household_id', params.household_id);
    if (params.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<Invoice[]>(`/billing/invoices${suffix}`);
  }

  async getInvoice(id: string) {
    return this.request<Invoice>(`/billing/invoices/${id}`);
  }

  async createCollection(payload: CashCollectionCreate) {
    return this.request<CashCollection>('/billing/collections', { method: 'POST', body: JSON.stringify(payload) });
  }

  async confirmCollection(id: string, confirm_code: string) {
    return this.request<CashCollection>(`/billing/collections/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirm_code }),
    });
  }

  async myCollections(unsettledOnly: boolean = false) {
    const suffix = unsettledOnly ? '?unsettled_only=true' : '';
    return this.request<CashCollection[]>(`/billing/collections/mine${suffix}`);
  }

  async cashOnHand() {
    return this.request<{ amount: number; num_collections: number }>('/billing/collections/cash-on-hand');
  }

  // ============ Settlements ============
  async submitSettlement(payload: { community_office_id: string; declared_amount: number; notes?: string }) {
    return this.request<Settlement>('/settlements/', { method: 'POST', body: JSON.stringify(payload) });
  }

  async confirmSettlement(id: string, confirmed_amount: number, notes?: string) {
    return this.request<Settlement>(`/settlements/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed_amount, notes }),
    });
  }

  async listSettlements(params: { status?: string; mine_only?: boolean } = { mine_only: true }) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.mine_only !== undefined) qs.set('mine_only', String(params.mine_only));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<Settlement[]>(`/settlements/${suffix}`);
  }

  async getSettlement(id: string) {
    return this.request<Settlement>(`/settlements/${id}`);
  }

  // ============ Notifications ============
  async getVapidPublicKey() {
    return this.request<{ public_key: string }>('/notifications/vapid-public-key');
  }

  async subscribePush(payload: { endpoint: string; p256dh: string; auth: string; user_agent?: string }) {
    return this.request<{ id: string }>('/notifications/subscribe', { method: 'POST', body: JSON.stringify(payload) });
  }

  async unsubscribePush(endpoint: string) {
    const qs = new URLSearchParams({ endpoint }).toString();
    return this.request<void>(`/notifications/subscribe?${qs}`, { method: 'DELETE' });
  }

  async listNotifications(unreadOnly: boolean = false) {
    const suffix = unreadOnly ? '?unread_only=true' : '';
    return this.request<NotificationItem[]>(`/notifications/${suffix}`);
  }

  async markNotificationRead(id: string) {
    return this.request<void>(`/notifications/${id}/read`, { method: 'POST' });
  }

  async sendTestNotification(title?: string, body?: string) {
    return this.request<NotificationItem>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'Test', body: body || 'Hello from Lokal' }),
    });
  }

  // ============ Support tickets ============
  async createTicket(payload: SupportTicketCreate) {
    return this.request<SupportTicket>('/support/tickets', { method: 'POST', body: JSON.stringify(payload) });
  }

  async listTickets(params: { status?: string; mine_only?: boolean; assigned_to_me?: boolean } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.mine_only) qs.set('mine_only', 'true');
    if (params.assigned_to_me) qs.set('assigned_to_me', 'true');
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<SupportTicket[]>(`/support/tickets${suffix}`);
  }

  async getTicket(id: string) {
    return this.request<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/support/tickets/${id}`);
  }

  async replyTicket(id: string, body: string, is_internal = false) {
    return this.request<SupportMessage>(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, is_internal }),
    });
  }

  async setTicketStatus(id: string, status: string) {
    return this.request<{ status: string }>(`/support/tickets/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async assignTicket(id: string, assignee_user_id: string) {
    return this.request<{ ok: boolean }>(`/support/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignee_user_id }),
    });
  }

  // ============ Roles (admin) ============
  async listRoleGrants() {
    return this.request<RoleGrant[]>('/support/roles');
  }

  async grantRole(user_id: string, role: string) {
    return this.request<{ ok: boolean }>('/support/roles/grant', {
      method: 'POST',
      body: JSON.stringify({ user_id, role }),
    });
  }

  async revokeRole(user_id: string, role: string) {
    return this.request<{ ok: boolean }>('/support/roles/revoke', {
      method: 'POST',
      body: JSON.stringify({ user_id, role }),
    });
  }

  // ============ Sales register / deposit ============
  async getWalletSummary() {
    return this.request<{
      balance: number;
      cash_on_hand: number;
      total_sales: { amount: number; count: number };
      total_deposits: { amount: number; count: number };
      total_topups: { amount: number; count: number };
    }>('/wallet/summary');
  }

  async depositToNxt(amount: number, note?: string, reference?: string) {
    return this.request<{ new_balance: number; reference: string; transaction_id: string }>(
      '/wallet/deposit-to-nxt',
      { method: 'POST', body: JSON.stringify({ amount, note, reference }) },
    );
  }

  async listExpiringHouseholds(days = 7) {
    return this.request<Array<{
      id: string;
      account_number: string;
      primary_contact_name: string;
      primary_contact_phone: string;
      suburb: string | null;
      city: string | null;
      meter_number: string;
      unlimited_expires_at: string;
      days_remaining: number;
    }>>(`/households/expiring?days=${days}`);
  }
}

export interface SupportTicketCreate {
  category: 'BILLING' | 'METER' | 'PAYMENT' | 'ACCOUNT' | 'TECHNICAL' | 'OTHER';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface SupportTicket {
  id: string;
  reference_number: string;
  opened_by: { id: string; name: string } | null;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  related_entity_type: string | null;
  related_entity_id: string | null;
  assigned_to: { id: string; name: string } | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  author?: { id: string; name: string } | null;
  body: string;
  attachment_url: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface RoleGrant {
  id: string;
  user_id: string;
  role: string;
  granted_at: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
}

// ============ Billing types ============

export interface TariffBlock {
  id?: string;
  from_kwh: number;
  to_kwh: number | null;
  rate_per_kwh: number;
  sort_order: number;
}

export interface TariffTimeBand {
  id?: string;
  name: string;
  start_hour: number;
  end_hour: number;
  rate_per_kwh: number;
  sort_order: number;
}

export interface Tariff {
  id: string;
  name: string;
  description: string | null;
  type: 'FLAT' | 'UNITS_BLOCK' | 'TIME_OF_USE';
  billing_period: 'WEEKLY' | 'MONTHLY';
  flat_rate_per_kwh: number | null;
  service_fee: number;
  is_active: number;
  blocks: TariffBlock[];
  time_bands: TariffTimeBand[];
}

export interface TariffCreate {
  name: string;
  description?: string;
  type: 'FLAT' | 'UNITS_BLOCK' | 'TIME_OF_USE';
  billing_period: 'WEEKLY' | 'MONTHLY';
  flat_rate_per_kwh?: number | null;
  service_fee?: number;
  blocks?: Omit<TariffBlock, 'id'>[];
  time_bands?: Omit<TariffTimeBand, 'id'>[];
}

export interface CommunityOffice {
  id: string;
  name: string;
  code: string;
  address: string | null;
  contact_phone: string | null;
  is_active: number;
}

export interface CommunityOfficeCreate {
  name: string;
  code: string;
  address?: string;
  contact_phone?: string;
  manager_user_id?: string;
}

export interface Household {
  id: string;
  account_number: string;
  primary_contact_name: string;
  primary_contact_phone: string;
  primary_contact_id_number: string | null;
  email: string | null;
  erf_number: string | null;
  street_address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  tariff_id: string;
  tariff_name?: string | null;
  meter_id: string | null;
  meter_number?: string | null;
  community_office_id: string | null;
  user_id: string | null;
  opening_balance: number;
  current_balance: number;
  last_reading_kwh: number;
  last_reading_at: string | null;
  status: string;
  created_at: string;
}

export interface HouseholdCreate {
  primary_contact_name: string;
  primary_contact_phone: string;
  primary_contact_id_number?: string;
  email?: string;
  erf_number?: string;
  street_address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  location_lat?: number;
  location_lng?: number;
  tariff_id: string;
  meter_number?: string;
  community_office_id?: string;
  user_phone?: string;
  opening_balance?: number;
  notes?: string;
}

export interface MeterReadingCreate {
  household_id: string;
  current_reading_kwh: number;
  peak_kwh?: number;
  standard_kwh?: number;
  off_peak_kwh?: number;
  photo_url?: string;
  notes?: string;
  issue_invoice?: boolean;
}

export interface InvoiceLineItem {
  label: string;
  kwh: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  household_id: string;
  household_account_number?: string | null;
  household_contact_name?: string | null;
  period_start: string;
  period_end: string;
  issue_date: string;
  due_date: string;
  previous_reading_kwh: number;
  current_reading_kwh: number;
  kwh_consumed: number;
  energy_charge: number;
  service_fee: number;
  total_amount: number;
  amount_paid: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  line_items: InvoiceLineItem[];
  notes: string | null;
  created_at: string;
}

export interface CashCollection {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number?: string | null;
  household_id: string;
  agent_id: string;
  amount: number;
  status: 'PENDING_HOUSEHOLD_CONFIRM' | 'CONFIRMED' | 'DISPUTED' | 'VOID';
  agent_confirmed_at: string | null;
  household_confirmed_at: string | null;
  household_confirm_code?: string | null;
  settled: boolean;
  settlement_id: string | null;
  collected_at: string;
}

export interface CashCollectionCreate {
  invoice_id: string;
  amount: number;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
}

export interface Settlement {
  id: string;
  reference_number: string;
  agent_id: string;
  community_office_id: string;
  community_office_name?: string | null;
  declared_amount: number;
  expected_amount: number;
  confirmed_amount: number | null;
  num_collections: number;
  status: 'SUBMITTED' | 'CONFIRMED' | 'DISPUTED' | 'CANCELLED';
  agent_confirmed_at: string | null;
  office_confirmed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string;
  data: string | null;
  is_read: boolean;
  created_at: string;
}

export const api = new ApiService();
export default api;
