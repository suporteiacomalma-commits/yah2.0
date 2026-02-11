import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useBrand } from "@/hooks/useBrand";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Auth from "./pages/Auth"; // Corrected from Login/Register
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import PhasePage from "./pages/PhasePage";
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
import { useEffect } from "react";

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
          <Dashboard />
        </ProtectedRouteInline>
      } />

      <Route path="/profile" element={
        <ProtectedRouteInline>
          <Profile />
        </ProtectedRouteInline>
      } />

      <Route path="/phase/:phaseId/*" element={
        <ProtectedRouteInline>
          <PhasePage />
        </ProtectedRouteInline>
      } />

      <Route path="/ideia-inbox" element={
        <ProtectedRouteInline>
          <IdeiaInbox />
        </ProtectedRouteInline>
      } />

      <Route path="/welcome" element={
        <ProtectedRouteInline>
          <Welcome />
        </ProtectedRouteInline>
      } />

      <Route path="/assistant" element={
        <ProtectedRouteInline>
          <Assistant />
        </ProtectedRouteInline>
      } />

      <Route path="/calendar" element={
        <ProtectedRouteInline>
          <Calendar />
        </ProtectedRouteInline>
      } />

      <Route path="/explore-map" element={
        <ProtectedRouteInline>
          <ExploreMap />
        </ProtectedRouteInline>
      } />

      <Route path="/admin/*" element={
        <AdminRoute>
          <Admin />
        </AdminRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
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
            <AppRoutes />
          </BrowserRouter>
          {/* <DebugOverlay /> */}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
