import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { generateActivitySlug } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ActivityCard from "@/components/ActivityCard";
import CreateActivityDialog from "@/components/CreateActivityDialog";
import LanguageSelector from "@/components/LanguageSelector";
import { User, Bell, Plus, LogIn, Settings } from "lucide-react";
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
  const { t } = useTranslation();

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
        title: t('common.error'),
        description: t('home.errorLoading'),
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
        title: t('home.loginRequired'),
        description: t('home.loginRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('home.joined'),
      description: t('home.joinedDesc'),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground py-8 px-4 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-2">{t('home.title')}</h1>
              <p className="text-xl opacity-90">{t('home.subtitle')}</p>
            </div>
            <div className="flex gap-3 items-center">
              <LanguageSelector />
              {user ? (
                <>
                  <Button variant="secondary" onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-5 w-5" />
                    Admin
                  </Button>
                  <Button variant="secondary" onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-5 w-5" />
                    {t('home.profile')}
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
                  {t('home.login')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {!user && (
          <div className="bg-secondary/20 border-2 border-secondary rounded-2xl p-8 mb-12 text-center">
            <h2 className="text-3xl font-semibold mb-4">{t('home.joinCommunity')}</h2>
            <p className="text-lg text-muted-foreground mb-6">
              {t('home.joinCommunityDesc')}
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              {t('home.joinFree')}
            </Button>
          </div>
        )}

        {notifications.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-6">{t('home.notifications')}</h2>
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
            <h2 className="text-3xl font-semibold">{t('home.featuredActivities')}</h2>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/actividades")}>
                {t('home.viewAll')}
              </Button>
              {user && (
                <CreateActivityDialog onActivityCreated={loadActivities} />
              )}
            </div>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-lg">{t('common.loading')}</p>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground text-lg">{t('home.noActivitiesYet')}</p>
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
                  {t('home.viewFullCalendar')}
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
