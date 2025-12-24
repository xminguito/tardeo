import { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useVoiceActivityTools } from "@/features/activities/hooks/useVoiceActivityTools";
import VoiceAssistant from "@/components/VoiceAssistant";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import { CookieConsentComponent } from "@/components/CookieConsent";
import { useComingSoon } from "@/hooks/useComingSoon";
import ComingSoon from "./pages/ComingSoon";
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
import MyCreations from "./pages/MyCreations";
import NotificationSettings from "./pages/NotificationSettings";
import TTSCostDashboard from "./pages/TTSCostDashboard";
import VoiceQualityDashboard from "./pages/VoiceQualityDashboard";
import TTSMonitor from "./pages/TTSMonitor";
import TTSAlertsConfig from "./pages/TTSAlertsConfig";
import TTSAnalytics from "./pages/TTSAnalytics";
import EmailTester from "./pages/EmailTester";
import EmailTemplates from "./pages/EmailTemplates";
import AdminLayout from "./layouts/AdminLayout";
import Onboarding from "./pages/Onboarding";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import Header from "./components/Header";
import PageTransition from "./components/PageTransition";
import { UserLocationProvider } from "@/hooks/useUserLocation";
import { initAnalytics, track } from "@/lib/analytics";
import { RealtimeNotificationsProvider } from "@/components/RealtimeNotificationsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/features/activities/hooks/useFavorites";

// Lazy load Analytics Dashboard (heavy component)
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));
const HeroBannersManager = lazy(() => import("./pages/admin/HeroBannersManager"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const Chat = lazy(() => import("./features/social/pages/Chat"));
const Friends = lazy(() => import("./features/social/pages/Friends"));
const UserProfile = lazy(() => import("./features/social/pages/UserProfile"));
const ExploreProfiles = lazy(() => import("./features/social/pages/ExploreProfiles"));
const FileManager = lazy(() => import("./pages/admin/FileManager"));
const SiteSettings = lazy(() => import("./pages/admin/SiteSettings"));
const PagesManager = lazy(() => import("./pages/admin/PagesManager"));
const CommunitiesList = lazy(() => import("./features/communities/pages/CommunitiesList"));
const CommunityDetail = lazy(() => import("./features/communities/pages/CommunityDetail"));

// Dynamic Page renderer (for CMS pages)
import DynamicPage from "./pages/DynamicPage";

// ============================================
// Onboarding Guard Hook
// ============================================
const useOnboardingCheck = (pathname: string) => {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Block UI immediately while we check - prevents stale redirects
    setLoading(true);

    const checkOnboarding = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) {
            setNeedsOnboarding(false);
            setLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        if (mounted) {
          // User needs onboarding if they don't have onboarding_completed = true
          setNeedsOnboarding(!!profile && profile.onboarding_completed !== true);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        if (mounted) {
          setNeedsOnboarding(false);
          setLoading(false);
        }
      }
    };

    checkOnboarding();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setLoading(true);
      }
      if (session?.user) {
        checkOnboarding();
      } else {
        if (mounted) {
          setNeedsOnboarding(false);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname]); // Re-check when route changes

  return { needsOnboarding, loading };
};

// ============================================
// Onboarding Route Guard Component
// ============================================
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { needsOnboarding, loading } = useOnboardingCheck(location.pathname);

  // Skip guard for certain routes
  const excludedRoutes = ['/auth', '/onboarding', '/admin'];
  const isExcluded = excludedRoutes.some(route => location.pathname.startsWith(route));

  // Show nothing while loading (or you could show a loader)
  if (loading) {
    return null;
  }

  // If user needs onboarding and not on excluded route, redirect
  if (needsOnboarding && !isExcluded) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user is on /onboarding but already completed, redirect to home
  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
 
const queryClient = new QueryClient();
 
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const voiceTools = useVoiceActivityTools(setFilters, filters, navigate);
  const { settings, loading: comingSoonLoading, shouldShowComingSoon, grantAccess } = useComingSoon();
  
  // Get favorites count for Header
  const { favorites } = useFavorites(user?.id);

  // Check if user is admin
  const checkIfAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsUserAdmin(!!data);
  };

  // Get current user for BottomNav and Header
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        checkIfAdmin(session.user.id);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkIfAdmin(session.user.id);
      } else {
        setIsUserAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
 
  // Track page navigation
  useEffect(() => {
    track('page_view', {
      path: location.pathname,
      title: document.title,
    });
  }, [location.pathname]);

  // Show coming soon page if enabled (but allow admin routes)
  if (!comingSoonLoading && shouldShowComingSoon && !location.pathname.startsWith('/admin')) {
    return <ComingSoon settings={settings} onAccessGranted={grantAccess} />;
  }

  // Rutas donde el Header NO debe aparecer
  const hideHeaderRoutes = ['/onboarding', '/admin'];
  const shouldShowHeader = !hideHeaderRoutes.some(route => location.pathname.startsWith(route));

  return (
    <UserLocationProvider>
      <OnboardingGuard>
        {/* Contenedor Principal: Ocupa toda la pantalla, sin scroll */}
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
          
          {/* HEADER GLOBAL - FUERA del viewTransitionName para permanecer estático */}
          {shouldShowHeader && (
            <Header 
              user={user} 
              isUserAdmin={isUserAdmin} 
              favoritesCount={favorites.size}
            />
          )}
          
          {/* ZONA A: CONTENIDO DINÁMICO (Lo que se mueve) */}
          {/* REGLA DE ORO: viewTransitionName va AQUÍ para aislar las animaciones */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden relative w-full"
            style={{ viewTransitionName: 'page-content' }}
          >
            {/* PageTransition handles native View Transitions API for smooth page changes */}
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/mi-cuenta" element={<MyAccount />} />
                <Route path="/mis-actividades" element={<MyActivities />} />
                <Route path="/mis-creaciones" element={<MyCreations />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/favoritos" element={<Favorites />} />
                <Route path="/notificaciones" element={<Notifications />} />
                <Route path="/actividades" element={<ActivitiesCalendar />} />
                <Route path="/actividades/:slug" element={<ActivityDetail />} />
                <Route path="/communities" element={<Suspense fallback={<div className="min-h-screen bg-background"><div className="bg-gradient-to-r from-primary/10 to-primary/5 h-[280px] md:h-[320px]" /></div>}><CommunitiesList /></Suspense>} />
                <Route path="/communities/:slug" element={<Suspense fallback={<div className="min-h-screen bg-background"><div className="bg-gradient-to-r from-primary/10 to-primary/5 h-[280px] md:h-[320px]" /></div>}><CommunityDetail /></Suspense>} />
                <Route path="/sobre-tardeo" element={<About />} />
                <Route path="/privacidad" element={<PrivacyPolicy />} />
                
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
                {/* Public profile routes - support both UUID and username */}
                <Route path="/u/:identifier" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                    <UserProfile />
                  </Suspense>
                } />
                {/* Legacy route for backwards compatibility */}
                <Route path="/user/:identifier" element={
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
                  <Route path="configuracion" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-lg text-muted-foreground">Loading...</p></div>}>
                      <SiteSettings />
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
                  <Route path="paginas" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-lg text-muted-foreground">Loading...</p></div>}>
                      <PagesManager />
                    </Suspense>
                  } />
                </Route>
                
                {/* Dynamic CMS Pages - MUST be before the catch-all 404 route */}
                {/* This catches root-level slugs like /privacidad, /terminos, etc. */}
                <Route path="/:slug" element={<DynamicPage />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
            
            {/* Footer - Hidden on auth, onboarding, and admin routes (handled internally) */}
            <Footer />
          </div>

          {/* ZONA B: UI PERSISTENTE (Lo que se queda quieto) */}
          {/* ESTO DEBE ESTAR FUERA del div con viewTransitionName */}
          <div className="z-50 relative">
            <VoiceAssistant clientTools={voiceTools} />
            {/* Bottom Navigation - Hide on onboarding and admin routes */}
            {!location.pathname.startsWith('/onboarding') && 
             !location.pathname.startsWith('/admin') && (
              <BottomNav user={user} />
            )}
          </div>
        </div>
        
        {/* Elementos flotantes fuera del layout principal */}
        <PWAInstallPrompt />
      </OnboardingGuard>
    </UserLocationProvider>
  );
};

const App = () => {
  useEffect(() => {
    // Listen for cookie consent events
    const handleCookieConsent = (event: CustomEvent) => {
      if (event.detail.analytics) {
        // Initialize analytics when user accepts
        initAnalytics()
          .then(() => {
            if (import.meta.env.DEV) {
              console.log('[Analytics] Initialized after consent');
            }
            track('app_opened', {});
          })
          .catch((error) => {
            if (import.meta.env.DEV) {
              console.error('[Analytics] Failed to initialize:', error);
            }
          });
      }
    };

    const handleCookieChange = (event: CustomEvent) => {
      if (!event.detail.analytics) {
        // User revoked analytics consent
        const { optOut } = require('@/lib/analytics');
        optOut();
      } else {
        // User granted analytics consent
        const { optIn } = require('@/lib/analytics');
        optIn();
      }
    };

    window.addEventListener('cookieconsentAccepted', handleCookieConsent as EventListener);
    window.addEventListener('cookieconsentChanged', handleCookieChange as EventListener);

    return () => {
      window.removeEventListener('cookieconsentAccepted', handleCookieConsent as EventListener);
      window.removeEventListener('cookieconsentChanged', handleCookieChange as EventListener);
    };
  }, []);

  return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CookieConsentComponent />
          <Toaster />
          <Sonner />
          <RealtimeNotificationsProvider />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
  );
};

export default App;
