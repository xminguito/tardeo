import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import PageTransition from "@/components/PageTransition";
import Header from "@/components/Header";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useFavorites } from "@/features/activities/hooks/useFavorites";

export default function ExploreProfiles() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const { favorites } = useFavorites(user?.id);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
      
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

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["public-profiles", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .eq("profile_visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);

      // Filter by search query if provided
      if (searchQuery.trim()) {
        query = query.or(
          `full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMM yyyy", { locale: es });
    } catch {
      return null;
    }
  };

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
            title="Explorar Perfiles"
            breadcrumbs={[
              { label: 'Inicio', href: '/' },
              { label: 'Explorar Perfiles' }
            ]}
          />

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, usuario, ciudad o biografía..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        {profiles && (
          <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{profiles.length} perfiles públicos encontrados</span>
            </div>
          </div>
        )}

        {/* Profiles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !profiles || profiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No se encontraron perfiles con esa búsqueda"
                  : "No hay perfiles públicos disponibles"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile: any) => (
              <Card
                key={profile.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/user/${profile.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback className="text-lg">
                        {profile.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {profile.full_name || "Usuario"}
                      </h3>
                      {profile.username && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                      )}
                      {profile.city && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{profile.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{profile.followers_count || 0}</span>
                      </div>
                      {profile.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(profile.created_at)}</span>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">
                      Ver perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </PageTransition>
    </div>
  );
}

