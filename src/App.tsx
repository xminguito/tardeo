import { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useVoiceActivityTools } from "@/features/activities/hooks/useVoiceActivityTools";
import VoiceAssistant from "@/components/VoiceAssistant";
import type { ActivityFilters } from "@/features/activities/types/activity.types";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ActivitiesCalendar from "./pages/ActivitiesCalendar";
import ActivityDetail from "./pages/ActivityDetail";
import UpdateAgent from "./pages/UpdateAgent";
import UpdateActivitiesLocation from "./pages/UpdateActivitiesLocation";
import TranslateActivities from "./pages/TranslateActivities";
import Admin from "./pages/Admin";
import Favorites from "./pages/Favorites";
import MyAccount from "./pages/MyAccount";
import MyActivities from "./pages/MyActivities";
import Notifications from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import TTSCostDashboard from "./pages/TTSCostDashboard";
import VoiceQualityDashboard from "./pages/VoiceQualityDashboard";
import TTSMonitor from "./pages/TTSMonitor";
import TTSAlertsConfig from "./pages/TTSAlertsConfig";
import TTSAnalytics from "./pages/TTSAnalytics";
import EmailTester from "./pages/EmailTester";
import EmailTemplates from "./pages/EmailTemplates";
import AdminLayout from "./layouts/AdminLayout";
import { UserLocationProvider } from "@/hooks/useUserLocation";
import { initAnalytics, track } from "@/lib/analytics";

// Lazy load Analytics Dashboard (heavy component)
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));
const HeroBannersManager = lazy(() => import("./pages/admin/HeroBannersManager"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const Chat = lazy(() => import("./features/social/pages/Chat"));
const Friends = lazy(() => import("./features/social/pages/Friends"));
const UserProfile = lazy(() => import("./features/social/pages/UserProfile"));
const ExploreProfiles = lazy(() => import("./features/social/pages/ExploreProfiles"));
const FileManager = lazy(() => import("./pages/admin/FileManager"));

 
const queryClient = new QueryClient();
 
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const voiceTools = useVoiceActivityTools(setFilters, filters, navigate);
 
  // Track page navigation
  useEffect(() => {
    track('page_view', {
      path: location.pathname,
      title: document.title,
    });
  }, [location.pathname]);

  return (
    <UserLocationProvider>
      <>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/mi-cuenta" element={<MyAccount />} />
          <Route path="/mis-actividades" element={<MyActivities />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/favoritos" element={<Favorites />} />
          <Route path="/notificaciones" element={<Notifications />} />
          <Route path="/actividades" element={<ActivitiesCalendar />} />
          <Route path="/actividades/:slug" element={<ActivityDetail />} />
          
          {/* Social Routes */}
          <Route path="/chat" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <Chat />
            </Suspense>
          } />
          <Route path="/friends" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <Friends />
            </Suspense>
          } />
          <Route path="/user/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <UserProfile />
            </Suspense>
          } />
          <Route path="/explorar-perfiles" element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <ExploreProfiles />
            </Suspense>
          } />

          
          {/* Admin routes with layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Admin />} />
            <Route path="analytics" element={
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-lg text-muted-foreground">Loading...</p></div>}>
                <AnalyticsDashboard />
              </Suspense>
            } />
            <Route path="hero-banners" element={
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-lg text-muted-foreground">Loading...</p></div>}>
                <HeroBannersManager />
              </Suspense>
            } />
            <Route path="usuarios" element={
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-lg text-muted-foreground">Loading...</p></div>}>
                <UserManagement />
              </Suspense>
            } />
            <Route path="archivos" element={
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-lg text-muted-foreground">Loading...</p></div>}>
                <FileManager />
              </Suspense>
            } />
            <Route path="notificaciones" element={<NotificationSettings />} />
            <Route path="tts-costs" element={<TTSCostDashboard />} />
            <Route path="voice-quality" element={<VoiceQualityDashboard />} />
            <Route path="tts-monitor" element={<TTSMonitor />} />
            <Route path="tts-alerts" element={<TTSAlertsConfig />} />
            <Route path="tts-analytics" element={<TTSAnalytics />} />
            <Route path="email-tester" element={<EmailTester />} />
            <Route path="plantillas-email" element={<EmailTemplates />} />
            <Route path="update-agent" element={<UpdateAgent />} />
            <Route path="traducir-actividades" element={<TranslateActivities />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <VoiceAssistant clientTools={voiceTools} />
      </>
    </UserLocationProvider>
  );
};

const App = () => {
  useEffect(() => {
    // Initialize analytics (lazy-loaded after interaction or 2s idle)
    initAnalytics()
      .then(() => {
        console.log('[Analytics] Initialized');
        track('app_opened', {});
      })
      .catch((error) => {
        console.error('[Analytics] Failed to initialize:', error);
      });
  }, []);

  return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
  );
};

export default App;
