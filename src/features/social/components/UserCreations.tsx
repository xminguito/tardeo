import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Euro } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface UserCreationsProps {
  userId: string;
  isPublic?: boolean;
}

export default function UserCreations({ userId, isPublic = true }: UserCreationsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["user-creations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("created_by", userId)
        .order("date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: isPublic && !!userId,
  });

  if (!isPublic) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sus Creaciones</CardTitle>
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
          <CardTitle>Sus Creaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sus Creaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Este usuario aún no ha creado actividades
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEE, d MMM. HH:mm'h'", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sus Creaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/activity/${activity.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold line-clamp-2">{activity.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(activity.date)}</span>
                  </div>
                  {activity.city && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{activity.city}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {activity.cost === 0 ? (
                    <Badge variant="secondary">Gratuita</Badge>
                  ) : (
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Euro className="h-4 w-4" />
                      <span>{activity.cost}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline">
                  Saber más
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

