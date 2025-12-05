import { useParams } from "react-router-dom";
import { useSocialProfile } from "../hooks/useSocialData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import PageTransition from "@/components/PageTransition";
import Header from "@/components/Header";
import UserProfileAbout from "../components/UserProfileAbout";
import UserCreations from "../components/UserCreations";
import UserPublications from "../components/UserPublications";
import UserForums from "../components/UserForums";
import UserReviews from "../components/UserReviews";
import FollowButton from "../components/FollowButton";
import FriendRequestButton from "../components/FriendRequestButton";
import { Button } from "@/components/ui/button";
import { MessageCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/features/activities/hooks/useFavorites";

const UserProfile = () => {
  // Support both /u/:identifier and /user/:identifier routes
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
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

  // Get reviews count (use profile.id once loaded)
  const { data: reviewsData } = useQuery({
    queryKey: ["user-reviews-count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { count: 0 };
      
      const { data: activities } = await supabase
        .from("activities")
        .select("id")
        .eq("created_by", profile.id);

      if (!activities || activities.length === 0) return { count: 0 };

      const { count } = await supabase
        .from("activity_ratings")
        .select("*", { count: "exact", head: true })
        .in("activity_id", activities.map((a) => a.id));

      return { count: count || 0 };
    },
    enabled: !!profile?.id && !!profile?.isPublic,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          user={user} 
          isUserAdmin={isUserAdmin} 
          favoritesCount={favorites.size}
        />
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
        <Header 
          user={user} 
          isUserAdmin={isUserAdmin} 
          favoritesCount={favorites.size}
        />
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
      <Header 
        user={user} 
        isUserAdmin={isUserAdmin} 
        favoritesCount={favorites.size}
      />
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <PageHeader 
            title={profile.full_name || "Perfil"}
            breadcrumbs={[
              { label: 'Inicio', href: '/' },
              { label: 'Explorar Perfiles', href: '/explorar-perfiles' },
              { label: profile.full_name || 'Perfil' }
            ]}
          />

        {/* Profile Header with Actions */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <UserProfileAbout 
              profile={profile} 
              reviewsCount={reviewsData?.count || 0}
              isOwnProfile={isOwnProfile}
            />
          </div>
          
          {!isOwnProfile && (
            <div className="flex flex-wrap gap-2">
              <FollowButton userId={profile.id} isFollowing={profile.isFollowing} />
              <FriendRequestButton userId={profile.id} status={profile.friendStatus} />
              <Button onClick={() => navigate(`/chat?userId=${profile.id}`)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat
              </Button>
            </div>
          )}
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
          {/* Creaciones */}
          <UserCreations userId={profile.id} isPublic={isPublic} />

          {/* Publicaciones */}
          <UserPublications userId={profile.id} isPublic={isPublic} />

          {/* Foros */}
          <UserForums userId={profile.id} isPublic={isPublic} />

          {/* Reseñas */}
          <UserReviews userId={profile.id} isPublic={isPublic} />
        </div>
        </div>
      </PageTransition>
    </div>
  );
};

export default UserProfile;
