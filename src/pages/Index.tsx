import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { generateActivitySlug } from "@/lib/utils";
import ActivityCard from "@/components/ActivityCard";
import CreateActivityDialog from "@/components/CreateActivityDialog";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/features/activities/hooks/useFavorites";
import { useActivities, ACTIVITIES_QUERY_KEY } from "@/features/activities/hooks/useActivities";
import { useSliderByPage } from "@/hooks/useSliderByPage";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import HeroSlider from "@/components/HeroSlider";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isFavorite, toggleFavorite, favorites } = useFavorites(user?.id);
  
  // Use the enhanced useActivities hook that includes participant data
  const { data: activities = [], isLoading: loading, refetch } = useActivities();
  
  // Limit to 6 activities for the home page
  const featuredActivities = activities.slice(0, 6);
  
  // Load slider for home page
  const { slides: heroSlides, loading: bannersLoading } = useSliderByPage('/');

  useEffect(() => {
    checkUser();
  }, []);

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

  const handleActivityCreated = () => {
    // Invalidate and refetch activities
    queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY });
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
                <CreateActivityDialog onActivityCreated={handleActivityCreated} />
              )}
            </div>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-lg">{t('common.loading')}</p>
          ) : featuredActivities.length === 0 ? (
            <p className="text-muted-foreground text-lg">{t('home.noActivitiesYet')}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredActivities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    onClick={() => navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`)} 
                    className="cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
                  >
                    <ActivityCard
                      activity={activity}
                      onReserve={(id) => {
                        const act = featuredActivities.find(a => a.id === id);
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
