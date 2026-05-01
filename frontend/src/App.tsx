import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import RegisterAgent from './pages/RegisterAgent';
import UserDashboard from './pages/user/Dashboard';
import WiFiPage from './pages/user/WiFi';
import ElectricityPage from './pages/user/Electricity';
import HistoryPage from './pages/user/History';
import ProfilePage from './pages/user/Profile';
import TopupPage from './pages/user/Topup';
import UserOnboarding from './pages/user/Onboarding';
import VouchersPage from './pages/user/Vouchers';
import AnalyticsPage from './pages/user/Analytics';
import AgentDashboard from './pages/agent/Dashboard';
import SellWiFiPage from './pages/agent/SellWiFi';
import SellElectricityPage from './pages/agent/SellElectricity';
import CommissionsPage from './pages/agent/Commissions';
import CustomersPage from './pages/agent/Customers';
import RegisterCustomerPage from './pages/agent/RegisterCustomer';
import FloatPage from './pages/agent/Float';
import AgentOnboarding from './pages/agent/Onboarding';
import SalesReportsPage from './pages/agent/SalesReports';
import AlertsPage from './pages/agent/Alerts';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsersPage from './pages/admin/Users';
import AdminAgentsPage from './pages/admin/Agents';
import AdminProductsPage from './pages/admin/Products';
import AdminReportsPage from './pages/admin/Reports';
import AdminSettingsPage from './pages/admin/Settings';
import AdminAuditLogsPage from './pages/admin/AuditLogs';
import AdminTariffsPage from './pages/admin/Tariffs';
import AdminCommunityOfficesPage from './pages/admin/CommunityOffices';
import AdminSettlementsPage from './pages/admin/Settlements';
import HouseholdsPage from './pages/agent/Households';
import HouseholdNewPage from './pages/agent/HouseholdNew';
import HouseholdDetailPage from './pages/agent/HouseholdDetail';
import MeterReadingPage from './pages/agent/MeterReading';
import AgentInvoiceDetailPage from './pages/agent/InvoiceDetail';
import SettlementPage from './pages/agent/Settlement';
import UserInvoicesPage from './pages/user/Invoices';
import UserInvoiceDetailPage from './pages/user/InvoiceDetail';
import ConfirmPaymentPage from './pages/user/ConfirmPayment';
import NotificationsPage from './pages/Notifications';
import SupportPage from './pages/Support';
import SupportTicketPage from './pages/SupportTicket';
import AdminRolesPage from './pages/admin/Roles';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    if (user?.is_admin) return '/admin';
    if (user?.is_agent) return '/agent';
    return '/user';
  };

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
      <Route path="/register/agent" element={<RegisterAgent />} />
      
      {/* User Routes */}
      <Route path="/user" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
      <Route path="/user/onboarding" element={<ProtectedRoute><UserOnboarding /></ProtectedRoute>} />
      <Route path="/user/wifi" element={<ProtectedRoute><WiFiPage /></ProtectedRoute>} />
      <Route path="/user/electricity" element={<ProtectedRoute><ElectricityPage /></ProtectedRoute>} />
      <Route path="/user/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/user/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/user/topup" element={<ProtectedRoute><TopupPage /></ProtectedRoute>} />
            <Route path="/user/vouchers" element={<ProtectedRoute><VouchersPage /></ProtectedRoute>} />
            <Route path="/user/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      
            {/* Agent Routes */}
      <Route path="/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
      <Route path="/agent/onboarding" element={<ProtectedRoute><AgentOnboarding /></ProtectedRoute>} />
      <Route path="/agent/sell/wifi" element={<ProtectedRoute><SellWiFiPage /></ProtectedRoute>} />
      <Route path="/agent/sell/electricity" element={<ProtectedRoute><SellElectricityPage /></ProtectedRoute>} />
      <Route path="/agent/commissions" element={<ProtectedRoute><CommissionsPage /></ProtectedRoute>} />
      <Route path="/agent/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/agent/customers/new" element={<ProtectedRoute><RegisterCustomerPage /></ProtectedRoute>} />
      <Route path="/agent/float" element={<ProtectedRoute><FloatPage /></ProtectedRoute>} />
      <Route path="/agent/reports" element={<ProtectedRoute><SalesReportsPage /></ProtectedRoute>} />
      <Route path="/agent/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/agent/households" element={<ProtectedRoute><HouseholdsPage /></ProtectedRoute>} />
      <Route path="/agent/households/new" element={<ProtectedRoute><HouseholdNewPage /></ProtectedRoute>} />
      <Route path="/agent/households/:id" element={<ProtectedRoute><HouseholdDetailPage /></ProtectedRoute>} />
      <Route path="/agent/households/:id/reading" element={<ProtectedRoute><MeterReadingPage /></ProtectedRoute>} />
      <Route path="/agent/invoices/:id" element={<ProtectedRoute><AgentInvoiceDetailPage /></ProtectedRoute>} />
      <Route path="/agent/settlements" element={<ProtectedRoute><SettlementPage /></ProtectedRoute>} />
      <Route path="/agent/settlements/:id" element={<ProtectedRoute><SettlementPage /></ProtectedRoute>} />

      {/* Notifications + Support (shared) */}
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      <Route path="/support/:id" element={<ProtectedRoute><SupportTicketPage /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/agents" element={<ProtectedRoute><AdminAgentsPage /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute><AdminProductsPage /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><AdminReportsPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute><AdminAuditLogsPage /></ProtectedRoute>} />
      <Route path="/admin/tariffs" element={<ProtectedRoute><AdminTariffsPage /></ProtectedRoute>} />
      <Route path="/admin/community-offices" element={<ProtectedRoute><AdminCommunityOfficesPage /></ProtectedRoute>} />
      <Route path="/admin/settlements" element={<ProtectedRoute><AdminSettlementsPage /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute><AdminRolesPage /></ProtectedRoute>} />

      {/* User extra routes */}
      <Route path="/user/invoices" element={<ProtectedRoute><UserInvoicesPage /></ProtectedRoute>} />
      <Route path="/user/invoices/:id" element={<ProtectedRoute><UserInvoiceDetailPage /></ProtectedRoute>} />
      <Route path="/user/payments/confirm/:id" element={<ProtectedRoute><ConfirmPaymentPage /></ProtectedRoute>} />

      {/* Default redirect based on role */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
