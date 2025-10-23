import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ActivityCard from "@/components/ActivityCard";
import VoiceAssistant from "@/components/VoiceAssistant";
import { Heart } from "lucide-react";

interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  current_participants: number;
  max_participants: number;
  image_url?: string;
}

const Index = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Error",
        description: "No pudimos cargar las actividades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinActivity = async (activityId: string) => {
    toast({
      title: "¡Genial!",
      description: "Te has apuntado a la actividad",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b-4 border-primary/20 shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-4">
            <Heart className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-primary">
              Amigo Mascota
            </h1>
          </div>
          <p className="text-center mt-4 text-xl text-muted-foreground">
            Encuentra compañía y actividades cerca de ti
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Actividades Disponibles
          </h2>
          <p className="text-xl text-muted-foreground">
            Descubre nuevas experiencias y conoce gente maravillosa
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground">
              Cargando actividades...
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-muted-foreground">
              Aún no hay actividades disponibles
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                id={activity.id}
                title={activity.title}
                description={activity.description}
                category={activity.category}
                location={activity.location}
                date={activity.date}
                currentParticipants={activity.current_participants}
                maxParticipants={activity.max_participants}
                imageUrl={activity.image_url}
                onJoin={handleJoinActivity}
              />
            ))}
          </div>
        )}
      </main>

      {/* Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
};

export default Index;
