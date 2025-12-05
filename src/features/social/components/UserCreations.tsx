import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import ActivityCard from "@/components/ActivityCard";
import type { ActivityWithParticipation, ParticipantPreview } from "@/features/activities/types/activity.types";
import { useState, useEffect } from "react";

interface UserCreationsProps {
  userId: string;
  isPublic?: boolean;
}

export default function UserCreations({ userId, isPublic = true }: UserCreationsProps) {
  const { t } = useTranslation();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user for participation check
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["user-creations", userId],
    queryFn: async () => {
      // Fetch activities created by this user
      const { data: rawActivities, error } = await supabase
        .from("activities")
        .select("*")
        .eq("created_by", userId)
        .order("date", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!rawActivities || rawActivities.length === 0) return [];

      // Get participant counts and previews for each activity
      const activityIds = rawActivities.map(a => a.id);
      
      // Fetch participant counts
      const { data: participantCounts } = await supabase
        .from("activity_participants")
        .select("activity_id")
        .in("activity_id", activityIds);

      // Count participants per activity
      const countMap: Record<string, number> = {};
      participantCounts?.forEach(p => {
        countMap[p.activity_id] = (countMap[p.activity_id] || 0) + 1;
      });

      // Fetch participant previews (up to 3 per activity)
      const { data: participantsWithProfiles } = await supabase
        .from("activity_participants")
        .select(`
          activity_id,
          user_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .in("activity_id", activityIds)
        .limit(30); // Enough for ~3 per activity

      // Build preview map
      const previewMap: Record<string, ParticipantPreview[]> = {};
      participantsWithProfiles?.forEach(p => {
        if (!previewMap[p.activity_id]) {
          previewMap[p.activity_id] = [];
        }
        if (previewMap[p.activity_id].length < 3 && p.profiles) {
          const profile = p.profiles as unknown as {
            id: string;
            full_name: string | null;
            username: string | null;
            avatar_url: string | null;
          };
          previewMap[p.activity_id].push({
            id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
          });
        }
      });

      // Check if current user is participating in any of these activities
      let userParticipationMap: Record<string, boolean> = {};
      if (currentUserId) {
        const { data: userParticipations } = await supabase
          .from("activity_participants")
          .select("activity_id")
          .eq("user_id", currentUserId)
          .in("activity_id", activityIds);
        
        userParticipations?.forEach(p => {
          userParticipationMap[p.activity_id] = true;
        });
      }

      // Transform to ActivityWithParticipation
      const transformed: ActivityWithParticipation[] = rawActivities.map(activity => {
        const participantsCount = countMap[activity.id] || 0;
        return {
          ...activity,
          participants_count: participantsCount,
          participants_preview: previewMap[activity.id] || [],
          isUserParticipating: userParticipationMap[activity.id] || false,
          availableSlots: activity.max_participants - participantsCount,
        };
      });

      return transformed;
    },
    enabled: isPublic && !!userId,
  });

  // Handler for reserve/join button (no-op in this context, just navigate)
  const handleReserve = () => {
    // The ActivityCard will handle navigation internally
  };

  if (!isPublic) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.creations', 'Sus Creaciones')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t('profile.privateProfile', 'Este perfil es privado')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.creations', 'Sus Creaciones')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.creations', 'Sus Creaciones')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t('profile.noActivities', 'Este usuario aún no ha creado actividades')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.creations', 'Sus Creaciones')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onReserve={handleReserve}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
