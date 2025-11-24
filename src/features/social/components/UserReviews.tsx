import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserReviewsProps {
  userId: string;
  isPublic?: boolean;
}

interface ReviewWithProfile {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function UserReviews({ userId, isPublic = true }: UserReviewsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-reviews", userId],
    queryFn: async () => {
      // First, get activities created by this user
      const { data: activities, error: activitiesError } = await supabase
        .from("activities")
        .select("id")
        .eq("created_by", userId);

      if (activitiesError) throw activitiesError;
      if (!activities || activities.length === 0) return { reviews: [], total: 0, comments: 0 };

      const activityIds = activities.map((a) => a.id);

      // Then, get all ratings for those activities
      const { data: ratings, error: ratingsError } = await supabase
        .from("activity_ratings")
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles!activity_ratings_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .in("activity_id", activityIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (ratingsError) throw ratingsError;

      const reviews = (ratings || []) as ReviewWithProfile[];
      const total = reviews.length;
      const comments = reviews.filter((r) => r.comment).length;

      return { reviews, total, comments };
    },
    enabled: isPublic && !!userId,
  });

  if (!isPublic) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reseñas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Este perfil es privado
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reseñas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reseñas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Este usuario aún no ha recibido reseñas
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reseñas</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-primary" />
              <span className="font-semibold">{data.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="font-semibold">{data.comments}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {data.reviews.map((review) => (
            <div key={review.id} className="flex gap-3 pb-4 border-b last:border-0">
              <Avatar className="w-10 h-10">
                <AvatarImage src={review.profiles?.avatar_url || ""} />
                <AvatarFallback>
                  {review.profiles?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {review.profiles?.full_name || "Usuario"}
                  </span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-sm ${
                          i < review.rating ? "text-yellow-400" : "text-gray-300"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

