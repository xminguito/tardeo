import { SocialProfile } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserProfileAboutProps {
  profile: SocialProfile & { 
    created_at?: string | null;
    city?: string | null;
    profile_visibility?: 'public' | 'private';
  };
  reviewsCount?: number;
  isOwnProfile?: boolean;
}

export default function UserProfileAbout({ 
  profile, 
  reviewsCount = 0,
  isOwnProfile = false 
}: UserProfileAboutProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
    } catch {
      return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name || "User"} />
            <AvatarFallback className="text-2xl">
              {profile.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">{profile.full_name || "Usuario"}</h2>
              {profile.username && (
                <span className="text-muted-foreground">@{profile.username}</span>
              )}
              {profile.profile_visibility === 'private' && !isOwnProfile && (
                <Badge variant="secondary" className="ml-2">
                  Privado
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {profile.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.city}</span>
                </div>
              )}
              {profile.created_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>En Tardeo desde: {formatDate(profile.created_at)}</span>
                </div>
              )}
            </div>

            {reviewsCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ThumbsUp className="h-4 w-4 text-primary" />
                <span className="font-semibold">{reviewsCount}</span>
                <span className="text-muted-foreground">Reseñas</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      {profile.bio && (
        <CardContent>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Sobre mi</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

