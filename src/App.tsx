import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
import { UserLocationProvider } from "@/hooks/useUserLocation";
 
const queryClient = new QueryClient();
 
const AppContent = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const voiceTools = useVoiceActivityTools(setFilters, filters, navigate);
 
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
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/notificaciones" element={<NotificationSettings />} />
          <Route path="/update-agent" element={<UpdateAgent />} />
          <Route path="/actualizar-ubicaciones" element={<UpdateActivitiesLocation />} />
          <Route path="/traducir-actividades" element={<TranslateActivities />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <VoiceAssistant clientTools={voiceTools} />
      </>
    </UserLocationProvider>
  );
};
 
const App = () => (
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
 
export default App;
