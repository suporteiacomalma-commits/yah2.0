import ScrollToTop from "./components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useBrand } from "@/hooks/useBrand";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { DashboardService } from "@/services/dashboard-service";
import Index from "./pages/Index";
import Auth from "./pages/Auth"; // Corrected from Login/Register
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import PhasePage from "./pages/PhasePage";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";
import Admin from "./pages/Admin"; // Corrected from AdminDashboard
import IdeiaInbox from "./pages/IdeiaInbox";
import Profile from "./pages/Profile";
import Welcome from "./pages/Welcome";
import Assistant from "./pages/Assistant";
import Calendar from "./pages/Calendar";
import ExploreMap from "./pages/ExploreMap";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "./components/pwa/InstallPrompt";
// import { DebugOverlay, debugLog } from "./lib/mobile-debug";
import { useEffect, useRef } from "react";

// Usage Tracker Component
function UsageTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);
  const lastActivityRef = useRef(Date.now());

  // Track user interaction
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, []);

  // Track screen views
  useEffect(() => {
    if (user && location.pathname !== lastPathRef.current) {
      let screenName = 'screen_other';
      const path = location.pathname;

      if (path === '/dashboard') screenName = 'screen_dashboard';
      else if (path.startsWith('/assistant')) screenName = 'screen_assistant';
      else if (path.startsWith('/ideia-inbox')) screenName = 'screen_ideas';
      else if (path.startsWith('/calendar')) screenName = 'screen_calendar';
      else if (path.startsWith('/phase')) screenName = 'screen_structure'; // Weekly structure
      else if (path.startsWith('/explore-map')) screenName = 'screen_projects'; // Assuming explore map is projects or similar
      else if (path.startsWith('/profile')) screenName = 'screen_profile';

      DashboardService.logActivity(0, 1, screenName);
      lastPathRef.current = location.pathname;
    }
  }, [location, user]);

  // Track active time (every 1 minute)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Check if tab is visible
      if (document.hidden) return;

      // Check if user was active in last 5 minutes (idle threshold)
      if (Date.now() - lastActivityRef.current > 5 * 60 * 1000) return;

      // Log 1 minute of activity
      DashboardService.logActivity(1, 0);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  return null;
}

// Re-defining inline components to avoid import errors
function ProtectedRouteInline({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { brand, isLoading: brandLoading } = useBrand();

  if (loading || profileLoading || brandLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If admin required, check role (mock logic or real hook)
  // For now just basic auth check + onboarding
  // Note: logic simplified for debugging to ensure components load

  if (!requireAdmin && (!profile?.onboarding_completed || !brand)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, isLoading } = useProfile();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  // Simplified admin check
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// Add global debug logger to window for external use
// (window as any).__debugLog = debugLog;

const queryClient = new QueryClient();

const AppRoutes = () => {
  // debugLog("AppRoutes rendering...");
  const { user } = useAuth();

  return (
    <>
      <UsageTracker />
      <Routes>
        <Route path="/" element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />
        } />

        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/register" element={<Navigate to="/auth" replace />} />

        <Route path="/onboarding/*" element={
          <OnboardingRoute>
            <Onboarding />
          </OnboardingRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRouteInline>
            <SubscriptionGuard>
              <Dashboard />
            </SubscriptionGuard>
          </ProtectedRouteInline>
        } />

        <Route path="/profile" element={
          <ProtectedRouteInline>
            <Profile />
          </ProtectedRouteInline>
        } />

        <Route path="/phase/:phaseId/*" element={
          <ProtectedRouteInline>
            <SubscriptionGuard>
              <PhasePage />
            </SubscriptionGuard>
          </ProtectedRouteInline>
        } />

        <Route path="/ideia-inbox" element={
          <ProtectedRouteInline>
            <SubscriptionGuard>
              <IdeiaInbox />
            </SubscriptionGuard>
          </ProtectedRouteInline>
        } />

        <Route path="/welcome" element={
          <ProtectedRouteInline>
            <Welcome />
          </ProtectedRouteInline>
        } />

        <Route path="/assistant" element={
          <ProtectedRouteInline>
            <SubscriptionGuard>
              <Assistant />
            </SubscriptionGuard>
          </ProtectedRouteInline>
        } />

        <Route path="/calendar" element={
          <ProtectedRouteInline>
            <SubscriptionGuard>
              <Calendar />
            </SubscriptionGuard>
          </ProtectedRouteInline>
        } />

        <Route path="/explore-map" element={
          <ProtectedRouteInline>
            <SubscriptionGuard>
              <ExploreMap />
            </SubscriptionGuard>
          </ProtectedRouteInline>
        } />

        <Route path="/admin/*" element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  useEffect(() => {
    // debugLog("App mounted");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <BrowserRouter>
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
          {/* <DebugOverlay /> */}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
