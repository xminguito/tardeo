import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { generateActivitySlug } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ActivityCard from "@/components/ActivityCard";
import LanguageSelector from "@/components/LanguageSelector";
import { User, Bell, Plus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  cost: number;
  current_participants: number;
  max_participants: number;
  image_url?: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

const Index = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    loadActivities();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      loadNotifications(session.user.id);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadNotifications(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("date", { ascending: true })
        .limit(6);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No pudimos cargar las actividades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (userId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) setNotifications(data);
  };

  const handleJoinActivity = async (activityId: string) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para apuntarte a actividades",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "¡Genial!",
      description: "Te has apuntado a la actividad",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground py-8 px-4 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-2">Tardeo</h1>
              <p className="text-xl opacity-90">Encuentra actividades y amigos con tus mismos intereses</p>
            </div>
            <div className="flex gap-3 items-center">
              <LanguageSelector />
              {user ? (
                <>
                  <Button variant="secondary" onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-5 w-5" />
                    Perfil
                  </Button>
                  {notifications.length > 0 && (
                    <div className="relative">
                      <Button variant="secondary">
                        <Bell className="h-5 w-5" />
                      </Button>
                      <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground">
                        {notifications.length}
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <Button variant="secondary" onClick={() => navigate("/auth")}>
                  <LogIn className="mr-2 h-5 w-5" />
                  Iniciar sesión
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {!user && (
          <div className="bg-secondary/20 border-2 border-secondary rounded-2xl p-8 mb-12 text-center">
            <h2 className="text-3xl font-semibold mb-4">¡Únete a nuestra comunidad! 🌟</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Crea tu cuenta gratis y empieza a disfrutar de experiencias increíbles cerca de casa
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Unirme gratis
            </Button>
          </div>
        )}

        {notifications.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-6">Notificaciones 🔔</h2>
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-accent/10 border border-accent/20 rounded-xl p-4 hover:bg-accent/20 transition-colors"
                >
                  <h3 className="font-semibold text-lg">{notif.title}</h3>
                  <p className="text-muted-foreground">{notif.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-semibold">Actividades próximas</h2>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/actividades")}>
                Ver todas las actividades
              </Button>
              {user && (
                <Button>
                  <Plus className="mr-2 h-5 w-5" />
                  Crear actividad
                </Button>
              )}
            </div>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-lg">Cargando actividades...</p>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground text-lg">No hay actividades disponibles</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activities.map((activity) => (
                  <div key={activity.id} onClick={() => navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`)} className="cursor-pointer">
                    <ActivityCard
                      activity={{
                        ...activity,
                        isUserParticipating: false,
                        availableSlots: activity.max_participants - activity.current_participants,
                      }}
                      onReserve={(id) => {
                        const act = activities.find(a => a.id === id);
                        if (act) navigate(`/actividades/${generateActivitySlug(act.title, act.id)}`);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Button size="lg" variant="outline" onClick={() => navigate("/actividades")}>
                  Ver calendario completo
                </Button>
              </div>
            </>
          )}
        </section>
      </main>

    </div>
  );
};

export default Index;
