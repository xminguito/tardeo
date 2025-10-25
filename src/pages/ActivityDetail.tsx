import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Users, Clock, Euro, ArrowLeft, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import VoiceAssistant from '@/components/VoiceAssistant';
import { useVoiceActivityTools } from '@/features/activities/hooks/useVoiceActivityTools';
import { ActivityRatings } from '@/features/activities/components/ActivityRatings';
import type { ActivityFilters } from '@/features/activities/types/activity.types';

interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  date: string;
  time: string;
  cost: number;
  current_participants: number;
  max_participants: number;
  image_url?: string | null;
  created_at?: string;
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipating, setIsParticipating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadActivity();
    checkUser();
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    
    if (user && id) {
      const { data } = await supabase
        .from('activity_participants')
        .select('*')
        .eq('activity_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsParticipating(!!data);
    }
  };

  const loadActivity = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setActivity(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No pudimos cargar la actividad',
        variant: 'destructive',
      });
      navigate('/actividades');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userId) {
      toast({
        title: 'Inicia sesión',
        description: 'Necesitas iniciar sesión para unirte',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!activity) return;

    try {
      // Check if already participating
      const { data: existingParticipation } = await supabase
        .from('activity_participants')
        .select('id')
        .eq('activity_id', activity.id)
        .eq('user_id', userId)
        .single();

      if (existingParticipation) {
        toast({
          title: 'Ya estás inscrito',
          description: 'Ya tienes una reserva para esta actividad',
        });
        return;
      }

      // Create participation
      const { error: participationError } = await supabase
        .from('activity_participants')
        .insert({
          activity_id: activity.id,
          user_id: userId,
        });

      if (participationError) throw participationError;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        activity_id: activity.id,
        title: 'Reserva confirmada',
        message: `Te has unido a ${activity.title}`,
        type: 'info',
      });

      toast({
        title: '¡Inscrito!',
        description: `Te has unido a ${activity.title}`,
      });

      setIsParticipating(true);
      loadActivity();
    } catch (error) {
      console.error('Error joining activity:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la reserva',
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: activity?.title,
        text: activity?.description || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace se ha copiado al portapapeles',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Cargando actividad...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Actividad no encontrada</p>
      </div>
    );
  }

  const isFull = activity.current_participants >= activity.max_participants;
  const availableSlots = activity.max_participants - activity.current_participants;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activity.image_url && (
              <div className="w-full h-[400px] rounded-lg overflow-hidden">
                <img
                  src={activity.image_url}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{activity.title}</h1>
                  <Badge className="text-lg px-4 py-1">{activity.category}</Badge>
                </div>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-lg text-muted-foreground leading-relaxed">
                {activity.description}
              </p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-lg">
                    <Calendar className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Fecha</p>
                      <time dateTime={activity.date}>
                        {format(new Date(activity.date), 'PPP', { locale: es })}
                      </time>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Hora</p>
                      <span>{activity.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Ubicación</p>
                      <span>{activity.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <Users className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Participantes</p>
                      <span>
                        {activity.current_participants} / {activity.max_participants}
                      </span>
                      {availableSlots > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {availableSlots} {availableSlots === 1 ? 'plaza disponible' : 'plazas disponibles'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-lg">
                    <Euro className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Precio</p>
                      <span className="text-2xl font-bold">
                        {activity.cost === 0 ? 'Gratis' : `${activity.cost.toFixed(2)}€`}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleJoin}
                  disabled={isFull || isParticipating}
                  className="w-full text-lg py-6"
                  size="lg"
                >
                  {isFull
                    ? 'Actividad completa'
                    : isParticipating
                    ? 'Ya estás apuntado'
                    : '¡Me apunto!'}
                </Button>

                {isParticipating && (
                  <p className="text-center text-sm text-muted-foreground">
                    Recibirás un recordatorio antes de la actividad
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ratings Section */}
        <div className="mt-12">
          <ActivityRatings activityId={activity.id} />
        </div>
      </div>

    </div>
  );
}
