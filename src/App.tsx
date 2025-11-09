// src/app.tsx
// @ts-nocheck

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
          
          {/* Admin Routes */}
          <Route path="/mv-admin/dashboard" element={<AdminDashboard />} />
          <Route path="/mv-admin/admin-users" element={<AdminUsers />} />
          <Route path="/mv-admin/users" element={<Users />} />
          <Route path="/mv-admin/sites" element={<Sites />} />
          <Route path="/mv-admin/billing" element={<Billing />} />
          <Route path="/mv-admin/logs" element={<Logs />} />
          <Route path="/mv-admin/permissions" element={<Permissions />} />
          <Route path="/mv-admin/settings" element={<Settings />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;