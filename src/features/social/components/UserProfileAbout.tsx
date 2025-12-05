import { SocialProfile } from "../types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, UserPlus, MessageCircle, Settings, CalendarCheck, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FollowButton from "./FollowButton";

interface UserProfileAboutProps {
  profile: SocialProfile & { 
    created_at?: string | null;
    city?: string | null;
    profile_visibility?: 'public' | 'private';
    isFollowing?: boolean;
    friendStatus?: "pending" | "accepted" | "blocked" | null;
    followersCount?: number;
    followingCount?: number;
  };
  reviewsCount?: number;
  eventsCount?: number;
  isOwnProfile?: boolean;
}

/** Individual Stat Block Component */
function StatBlock({ 
  icon: Icon, 
  value, 
  label, 
}: { 
  icon: React.ElementType; 
  value: number; 
  label: string; 
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3">
      <Icon className="h-5 w-5 text-primary/70" />
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs md:text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function UserProfileAbout({ 
  profile, 
  reviewsCount = 0,
  eventsCount,
  isOwnProfile = false 
}: UserProfileAboutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMM yyyy", { locale: es });
    } catch {
      return null;
    }
  };

  const followersCount = profile.followersCount ?? 0;
  const followingCount = profile.followingCount ?? 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Avatar + Info + Actions */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Avatar */}
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name || "User"} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {profile.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            
            {/* Info section */}
            <div className="flex-1 min-w-0">
              {/* Name & Username */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{profile.full_name || "Usuario"}</h2>
                {profile.profile_visibility === 'private' && !isOwnProfile && (
                  <Badge variant="secondary" className="text-xs">
                    Privado
                  </Badge>
                )}
              </div>
              
              {profile.username && (
                <p className="text-muted-foreground text-sm mb-2">@{profile.username}</p>
              )}
              
              {/* Location & Join Date */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {profile.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile.city}</span>
                  </div>
                )}
                {profile.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Desde {formatDate(profile.created_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              {isOwnProfile ? (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/mi-cuenta')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {t('profile.editProfile', 'Editar Perfil')}
                </Button>
              ) : (
                <>
                  <FollowButton 
                    userId={profile.id} 
                    isFollowing={profile.isFollowing || false} 
                  />
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/chat?userId=${profile.id}`)}
                    className="gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('profile.message', 'Mensaje')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats Row - Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-b bg-muted/20 -mx-6 px-6">
            <StatBlock
              icon={Users}
              value={followersCount}
              label={t('profile.followers', 'Seguidores')}
            />
            
            <StatBlock
              icon={UserPlus}
              value={followingCount}
              label={t('profile.following', 'Siguiendo')}
            />
            
            <StatBlock
              icon={CalendarCheck}
              value={eventsCount ?? 0}
              label={t('profile.events', 'Eventos')}
            />
            
            <StatBlock
              icon={Star}
              value={reviewsCount}
              label={t('profile.reviews', 'Reseñas')}
            />
          </div>

          {/* Action Buttons - Mobile */}
          <div className="flex sm:hidden gap-2 w-full">
            {isOwnProfile ? (
              <Button 
                variant="outline" 
                onClick={() => navigate('/mi-cuenta')}
                className="flex-1 gap-2"
              >
                <Settings className="h-4 w-4" />
                {t('profile.editProfile', 'Editar Perfil')}
              </Button>
            ) : (
              <>
                <FollowButton 
                  userId={profile.id} 
                  isFollowing={profile.isFollowing || false}
                  className="flex-1"
                />
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/chat?userId=${profile.id}`)}
                  className="flex-1 gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t('profile.message', 'Mensaje')}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      {/* Bio Section */}
      {profile.bio && (
        <CardContent className="pt-0">
          <p className="text-muted-foreground whitespace-pre-wrap text-sm md:text-base leading-relaxed">
            {profile.bio}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
