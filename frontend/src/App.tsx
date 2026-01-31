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
import AgentDashboard from './pages/agent/Dashboard';
import SellWiFiPage from './pages/agent/SellWiFi';
import SellElectricityPage from './pages/agent/SellElectricity';
import CommissionsPage from './pages/agent/Commissions';
import CustomersPage from './pages/agent/Customers';
import RegisterCustomerPage from './pages/agent/RegisterCustomer';
import FloatPage from './pages/agent/Float';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsersPage from './pages/admin/Users';
import AdminAgentsPage from './pages/admin/Agents';
import AdminProductsPage from './pages/admin/Products';
import AdminReportsPage from './pages/admin/Reports';
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
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/user" replace /> : <Login />} />
      <Route path="/register/agent" element={<RegisterAgent />} />
      
      {/* User Routes */}
      <Route path="/user" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
      <Route path="/user/wifi" element={<ProtectedRoute><WiFiPage /></ProtectedRoute>} />
      <Route path="/user/electricity" element={<ProtectedRoute><ElectricityPage /></ProtectedRoute>} />
      <Route path="/user/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/user/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/user/topup" element={<ProtectedRoute><TopupPage /></ProtectedRoute>} />
      
      {/* Agent Routes */}
      <Route path="/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
      <Route path="/agent/sell/wifi" element={<ProtectedRoute><SellWiFiPage /></ProtectedRoute>} />
      <Route path="/agent/sell/electricity" element={<ProtectedRoute><SellElectricityPage /></ProtectedRoute>} />
      <Route path="/agent/commissions" element={<ProtectedRoute><CommissionsPage /></ProtectedRoute>} />
      <Route path="/agent/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/agent/customers/new" element={<ProtectedRoute><RegisterCustomerPage /></ProtectedRoute>} />
      <Route path="/agent/float" element={<ProtectedRoute><FloatPage /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/agents" element={<ProtectedRoute><AdminAgentsPage /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute><AdminProductsPage /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><AdminReportsPage /></ProtectedRoute>} />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/user" replace />} />
      <Route path="*" element={<Navigate to="/user" replace />} />
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
