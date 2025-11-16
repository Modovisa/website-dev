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

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import Users from "./pages/admin/Users";
import Sites from "./pages/admin/Sites";
import Billing from "./pages/admin/Billing";
import Logs from "./pages/admin/Logs";
import Permissions from "./pages/admin/Permissions";
import Settings from "./pages/admin/Settings";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminTwoFactorAuth from "./pages/admin/AdminTwoFactorAuth";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword";
import { RequireAdminAuth } from "./components/admin/RequireAdminAuth";

// 📚 Docs pages
import Documentation from "@/pages/docs/Documentation";
import DocsRegister from "@/pages/docs/Register"; // ⬅️ renamed to avoid clash
import SetupTracking from "@/pages/docs/SetupTracking";
import WordPress from "@/pages/docs/WordPress";
import Shopify from "@/pages/docs/Shopify";
import Magento from "@/pages/docs/Magento";
import PrestaShop from "@/pages/docs/PrestaShop";
import BigCommerce from "@/pages/docs/BigCommerce";
import Joomla from "@/pages/docs/Joomla";
import Drupal from "@/pages/docs/Drupal";
import Wix from "@/pages/docs/Wix";
import Squarespace from "@/pages/docs/Squarespace";
import Webflow from "@/pages/docs/Webflow";
import Ghost from "@/pages/docs/Ghost";

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

          {/* Docs Routes */}
          <Route path="/docs" element={<Documentation />} />
          {/* 📚 docs/register stays as the documentation page */}
          <Route path="/docs/register" element={<DocsRegister />} />
          <Route path="/docs/setup" element={<SetupTracking />} />

          {/* Installation Guides */}
          <Route path="/docs/install/wordpress" element={<WordPress />} />
          <Route path="/docs/install/shopify" element={<Shopify />} />
          <Route path="/docs/install/magento" element={<Magento />} />
          <Route path="/docs/install/prestashop" element={<PrestaShop />} />
          <Route path="/docs/install/bigcommerce" element={<BigCommerce />} />
          <Route path="/docs/install/joomla" element={<Joomla />} />
          <Route path="/docs/install/drupal" element={<Drupal />} />
          <Route path="/docs/install/wix" element={<Wix />} />
          <Route path="/docs/install/squarespace" element={<Squarespace />} />
          <Route path="/docs/install/webflow" element={<Webflow />} />
          <Route path="/docs/install/ghost" element={<Ghost />} />

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

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
