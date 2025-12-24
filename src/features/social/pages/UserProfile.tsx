import { useParams } from "react-router-dom";
import { useSocialProfile } from "../hooks/useSocialData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import PageTransition from "@/components/PageTransition";
import UserProfileAbout from "../components/UserProfileAbout";
import UserGallery from "../components/UserGallery";
import UserCreations from "../components/UserCreations";
import UserReviews from "../components/UserReviews";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/features/activities/hooks/useFavorites";

const UserProfile = () => {
  // Support both /u/:identifier and /user/:identifier routes
  const { identifier } = useParams<{ identifier: string }>();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const { favorites } = useFavorites(user?.id);
  
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
      setCurrentUserId(user?.id);
      
      if (user) {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        setIsUserAdmin(!!adminRole);
      }
    };
    checkUser();
  }, []);

  // useSocialProfile now accepts either UUID or username
  const { data: profile, isLoading, error } = useSocialProfile(identifier || "");

  // Get profile stats (reviews count + events created)
  const { data: profileStats } = useQuery({
    queryKey: ["user-profile-stats", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { reviewsCount: 0, eventsCount: 0 };
      
      // Get activities created by this user
      const { data: activities, count: activitiesCount } = await supabase
        .from("activities")
        .select("id", { count: "exact" })
        .eq("created_by", profile.id);

      const eventsCount = activitiesCount || 0;

      if (!activities || activities.length === 0) {
        return { reviewsCount: 0, eventsCount };
      }

      // Get reviews count on those activities
      const { count: reviewsCount } = await supabase
        .from("activity_ratings")
        .select("*", { count: "exact", head: true })
        .in("activity_id", activities.map((a) => a.id));

      return { 
        reviewsCount: reviewsCount || 0, 
        eventsCount 
      };
    },
    enabled: !!profile?.id && !!profile?.isPublic,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageTransition>
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center min-h-[400px]">
              <p className="text-muted-foreground">Cargando perfil...</p>
            </div>
          </div>
        </PageTransition>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <PageTransition>
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center min-h-[400px]">
              <p className="text-muted-foreground">Usuario no encontrado</p>
            </div>
          </div>
        </PageTransition>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const isPublic = profile.isPublic ?? true;

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <PageHeader 
            title={profile.full_name || "Perfil"}
            breadcrumbs={[
              { label: 'Inicio', href: '/' },
              { label: 'Explorar Perfiles', href: '/explorar-perfiles' },
              { label: profile.full_name || 'Perfil' }
            ]}
          />

        {/* Profile Header Card - includes stats and action buttons */}
        <div className="mb-6">
          <UserProfileAbout 
            profile={profile} 
            reviewsCount={profileStats?.reviewsCount || 0}
            eventsCount={profileStats?.eventsCount}
            isOwnProfile={isOwnProfile}
          />
        </div>

        {/* Privacy Notice */}
        {!isPublic && !isOwnProfile && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/50 flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Este perfil es privado. Solo puedes ver información básica.
            </p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-6">
          {/* Galería - User's photo gallery (only if has images) */}
          <UserGallery 
            images={(profile as any).gallery_images as string[] || []} 
            isPublic={isPublic} 
          />

          {/* Creaciones - Activities created by this user */}
          <UserCreations userId={profile.id} isPublic={isPublic} />

          {/* Reseñas - Reviews on activities created by this user */}
          <UserReviews userId={profile.id} isPublic={isPublic} />
        </div>
        </div>
      </PageTransition>
    </div>
  );
};

export default UserProfile;
