import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Index from './pages/Index';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/app/Dashboard';
import LiveTracking from './pages/app/LiveTracking';
import TrackingSetup from './pages/app/TrackingSetup';
import Installation from './pages/app/Installation';
import UserProfile from './pages/app/UserProfile';

// MV Admin Pages
import MVAdminLogin from './pages/mv-admin/Login';
import MVAdminDashboard from './pages/mv-admin/Dashboard';
import MVAdminUsers from './pages/mv-admin/Users';
import MVAdminUserProfile from './pages/mv-admin/UserProfile';
import MVAdminSites from './pages/mv-admin/Sites';
import MVAdminBilling from './pages/mv-admin/Billing';
import MVAdminSettings from './pages/mv-admin/Settings';
import MVAdminLogs from './pages/mv-admin/Logs';
import MVAdminPermissions from './pages/mv-admin/Permissions';

// Docs
import DocsIndex from './pages/docs/Index';
import DocsInstall from './pages/docs/Install';
import DocsRegister from './pages/docs/Register';
import DocsSetupTracking from './pages/docs/SetupTracking';

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = window.__mvAccess?.token;
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          
          {/* App Routes (Protected) */}
          <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/app/live-tracking" element={<ProtectedRoute><LiveTracking /></ProtectedRoute>} />
          <Route path="/app/tracking-setup" element={<ProtectedRoute><TrackingSetup /></ProtectedRoute>} />
          <Route path="/app/installation" element={<ProtectedRoute><Installation /></ProtectedRoute>} />
          <Route path="/app/user-profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          
          {/* MV Admin Routes (Protected) */}
          <Route path="/mv-admin/login" element={<MVAdminLogin />} />
          <Route path="/mv-admin/dashboard" element={<ProtectedRoute><MVAdminDashboard /></ProtectedRoute>} />
          <Route path="/mv-admin/users" element={<ProtectedRoute><MVAdminUsers /></ProtectedRoute>} />
          <Route path="/mv-admin/user-profile" element={<ProtectedRoute><MVAdminUserProfile /></ProtectedRoute>} />
          <Route path="/mv-admin/sites" element={<ProtectedRoute><MVAdminSites /></ProtectedRoute>} />
          <Route path="/mv-admin/billing" element={<ProtectedRoute><MVAdminBilling /></ProtectedRoute>} />
          <Route path="/mv-admin/settings" element={<ProtectedRoute><MVAdminSettings /></ProtectedRoute>} />
          <Route path="/mv-admin/logs" element={<ProtectedRoute><MVAdminLogs /></ProtectedRoute>} />
          <Route path="/mv-admin/permissions" element={<ProtectedRoute><MVAdminPermissions /></ProtectedRoute>} />
          
          {/* Docs Routes */}
          <Route path="/docs" element={<DocsIndex />} />
          <Route path="/docs/install" element={<DocsInstall />} />
          <Route path="/docs/register" element={<DocsRegister />} />
          <Route path="/docs/setup-tracking" element={<DocsSetupTracking />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;