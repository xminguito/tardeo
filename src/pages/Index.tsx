import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { generateActivitySlug } from "@/lib/utils";
import { calculateDistance, geocodeLocation } from "@/lib/distance";
import ActivityCard from "@/components/ActivityCard";
import CreateActivityDialog from "@/components/CreateActivityDialog";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/features/activities/hooks/useFavorites";
import { useUserParticipations } from "@/features/activities/hooks/useUserParticipations";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useSliderByPage } from "@/hooks/useSliderByPage";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import HeroSlider from "@/components/HeroSlider";

interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  city?: string | null;
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
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { isFavorite, toggleFavorite, favorites } = useFavorites(user?.id);
  const { isParticipating } = useUserParticipations();
  const { location } = useUserLocation();
  
  // Load slider for home page
  const { slides: heroSlides, loading: bannersLoading } = useSliderByPage('/');

  useEffect(() => {
    checkUser();
    loadActivities();
  }, []);

  // Recargar actividades cuando cambie la ubicación
  useEffect(() => {
    if (location) {
      loadActivities();
    }
  }, [location]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      loadNotifications(session.user.id);
      checkIfAdmin(session.user.id);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadNotifications(session.user.id);
        checkIfAdmin(session.user.id);
      } else {
        setIsUserAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  };

  const checkIfAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsUserAdmin(!!data);
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("date", { ascending: true })
        .limit(6);

      if (error) throw error;

      let activitiesData = (data || []) as Activity[];
      
      // Filtrar por distancia usando la ubicación del usuario si está disponible
      if (location?.coordinates) {
        const { lat: userLat, lng: userLng } = location.coordinates;
        const radiusKm = location.searchRadius ?? 100;

        const activitiesWithCoords = await Promise.all(
          activitiesData.map(async (activity) => {
            let lat = (activity as any).latitude ?? null;
            let lng = (activity as any).longitude ?? null;

            if (lat == null || lng == null) {
              const geo = await geocodeLocation(activity.city || activity.location);
              if (geo) {
                lat = geo.lat;
                lng = geo.lng;
              }
            }

            return { activity, lat, lng };
          })
        );

        activitiesData = activitiesWithCoords
          .filter(({ lat, lng }) => lat != null && lng != null)
          .filter(({ lat, lng }) => {
            const distance = calculateDistance(
              userLat,
              userLng,
              lat as number,
              lng as number
            );
            return distance <= radiusKm;
          })
          .map(({ activity }) => activity);
      } else if (location?.city) {
        const cityLower = location.city.toLowerCase();
        activitiesData = activitiesData.filter((activity) =>
          activity.city?.toLowerCase().includes(cityLower)
        );
      }

      setActivities(activitiesData);
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header 
        user={user} 
        isUserAdmin={isUserAdmin} 
        favoritesCount={favorites.size}
      />

      <PageTransition>
        {/* Hero Slider */}
        {!bannersLoading && heroSlides.length > 0 && (
          <div className="container mx-auto px-4 pt-8 pb-4">
            <HeroSlider slides={heroSlides} autoplayInterval={5000} />
          </div>
        )}

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

        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl md:text-3xl font-semibold">{t('home.featuredActivities')}</h2>
            <div className="flex gap-2 md:gap-3 flex-shrink-0">
              <Button variant="outline" size="sm" className="md:size-default" onClick={() => navigate("/actividades")}>
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
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    onClick={() => navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`)} 
                    className="cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
                  >
                    <ActivityCard
                      activity={{
                        ...activity,
                        isUserParticipating: isParticipating(activity.id),
                        availableSlots: activity.max_participants - activity.current_participants,
                      }}
                      onReserve={(id) => {
                        const act = activities.find(a => a.id === id);
                        if (act) navigate(`/actividades/${generateActivitySlug(act.title, act.id)}`);
                      }}
                      isFavorite={isFavorite(activity.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Button size="default" variant="outline" onClick={() => navigate("/actividades")}>
                  {t('home.viewFullCalendar')}
                </Button>
              </div>
            </>
          )}
        </section>
      </main>
      </PageTransition>
    </div>
  );
};

export default Index;
