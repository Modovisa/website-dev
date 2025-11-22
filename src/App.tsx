// src/app.tsx
// @ts-nocheck

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register"; // 🔐 REAL account registration page

import TwoFactorAuth from "./pages/auth/TwoFactorAuth";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import Dashboard from "./pages/app/Dashboard";
import LiveTracking from "./pages/app/LiveTracking";
import Installation from "./pages/app/Installation";
import TrackingSetup from "./pages/app/TrackingSetup";
import Profile from "./pages/app/Profile";

import ContactUs from "./pages/ContactUs";
import NotFound from "./pages/NotFound";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserProfilePage from "./pages/admin/UserProfile";
import Users from "./pages/admin/Users";
import Sites from "./pages/admin/Sites";
import Billing from "./pages/admin/Billing";
import Logs from "./pages/admin/Logs";
import Permissions from "./pages/admin/Permissions";
import Settings from "./pages/admin/Settings";
import AdminUserProfile from "./pages/admin/AdminUserProfile";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminTwoFactorAuth from "./pages/admin/AdminTwoFactorAuth";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword";
import { RequireAdminAuth } from "./components/admin/RequireAdminAuth";

// 📚 Guides pages
import Documentation from "@/pages/guides/Documentation";
import GuidesRegister from "@/pages/guides/Register"; // ⬅️ renamed to avoid clash
import SetupTracking from "@/pages/guides/SetupTracking";
import WordPress from "@/pages/guides/WordPress";
import Shopify from "@/pages/guides/Shopify";
import Magento from "@/pages/guides/Magento";
import PrestaShop from "@/pages/guides/PrestaShop";
import BigCommerce from "@/pages/guides/BigCommerce";
import Joomla from "@/pages/guides/Joomla";
import Drupal from "@/pages/guides/Drupal";
import Wix from "@/pages/guides/Wix";
import Squarespace from "@/pages/guides/Squarespace";
import Webflow from "@/pages/guides/Webflow";
import Ghost from "@/pages/guides/Ghost";
import InstallGuides from "@/pages/guides/InstallGuides";

// ⚖️ Legal pages
import TermsAndConditions from "./pages/legal/TermsAndConditions";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import CookiePolicy from "./pages/legal/CookiePolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          {/* ✅ REAL registration page at /register */}
          <Route path="/register" element={<Register />} />
          <Route path="/contact-us" element={<ContactUs />} />

          {/* Legal Routes */}
          <Route
            path="/legal/terms-and-conditions"
            element={<TermsAndConditions />}
          />
          <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/legal/cookie-policy" element={<CookiePolicy />} />

          {/* Auth Routes */}
          <Route path="/2fa" element={<TwoFactorAuth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* App Routes */}
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/live-tracking" element={<LiveTracking />} />
          <Route path="/app/installation" element={<Installation />} />
          <Route path="/app/tracking-setup" element={<TrackingSetup />} />
          <Route path="/app/profile" element={<Profile />} />

          {/* Guides Routes */}
          <Route path="/guides" element={<Documentation />} />
          <Route path="/guides/register" element={<GuidesRegister />} />
          <Route path="/guides/setup" element={<SetupTracking />} />

          {/* Installation Guides index (default) */}
          <Route path="/guides/install" element={<InstallGuides />} />

          {/* Individual Installation Guides */}
          <Route path="/guides/install/wordpress" element={<WordPress />} />
          <Route path="/guides/install/shopify" element={<Shopify />} />
          <Route path="/guides/install/magento" element={<Magento />} />
          <Route path="/guides/install/prestashop" element={<PrestaShop />} />
          <Route path="/guides/install/bigcommerce" element={<BigCommerce />} />
          <Route path="/guides/install/joomla" element={<Joomla />} />
          <Route path="/guides/install/drupal" element={<Drupal />} />
          <Route path="/guides/install/wix" element={<Wix />} />
          <Route path="/guides/install/squarespace" element={<Squarespace />} />
          <Route path="/guides/install/webflow" element={<Webflow />} />
          <Route path="/guides/install/ghost" element={<Ghost />} />

          {/* Admin Login + 2FA (public) */}
          <Route path="/mv-admin/login" element={<AdminLogin />} />
          <Route
            path="/mv-admin/two-step-verification"
            element={<AdminTwoFactorAuth />}
          />
          <Route
            path="/mv-admin/forgot-password"
            element={<AdminForgotPassword />}
          />

          {/* Admin Routes (protected) */}
          {/* Base admin path goes to dashboard */}
          <Route
            path="/mv-admin"
            element={
              <RequireAdminAuth>
                <AdminDashboard />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/dashboard"
            element={
              <RequireAdminAuth>
                <AdminDashboard />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/admin-users"
            element={
              <RequireAdminAuth>
                <AdminUsers />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/users"
            element={
              <RequireAdminAuth>
                <Users />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/sites"
            element={
              <RequireAdminAuth>
                <Sites />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/billing"
            element={
              <RequireAdminAuth>
                <Billing />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/logs"
            element={
              <RequireAdminAuth>
                <Logs />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/permissions"
            element={
              <RequireAdminAuth>
                <Permissions />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/settings"
            element={
              <RequireAdminAuth>
                <Settings />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/profile"
            element={
              <RequireAdminAuth>
                <AdminUserProfile />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/mv-admin/user-profile"
            element={
              <RequireAdminAuth>
                <AdminUserProfilePage />
              </RequireAdminAuth>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
