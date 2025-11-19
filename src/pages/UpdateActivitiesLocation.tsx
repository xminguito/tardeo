import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';
import Header from '@/components/Header';

export default function UpdateActivitiesLocation() {
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const updateActivities = async () => {
    setLoading(true);
    try {
      // Update activities with city and coordinates
      const updates = [
        {
          id: '6a730558-25a9-4f0a-bc83-f322b6935bed',
          city: 'Madrid',
          province: 'Madrid',
          country: 'España',
          latitude: 40.4168,
          longitude: -3.7038,
        },
        {
          id: '9ce6f42e-6da8-406f-bb95-b8dfb16d19a7',
          city: 'Igualada',
          province: 'Barcelona',
          country: 'España',
          latitude: 41.5765,
          longitude: 1.6175,
        },
        {
          id: '95ad6dbf-9048-4ed8-b1c2-153a578396db',
          city: 'Igualada',
          province: 'Barcelona',
          country: 'España',
          latitude: 41.5765,
          longitude: 1.6175,
        },
        {
          id: 'b9067371-2945-4885-88b9-549eafd6ebdf',
          city: 'Igualada',
          province: 'Barcelona',
          country: 'España',
          latitude: 41.5765,
          longitude: 1.6175,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('activities')
          .update({
            city: update.city,
            province: update.province,
            country: update.country,
            latitude: update.latitude,
            longitude: update.longitude,
          })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating activity:', update.id, error);
          throw error;
        }
      }

      toast({
        title: '¡Actualizado!',
        description: 'Se han actualizado las ubicaciones de todas las actividades.',
      });
      setUpdated(true);
    } catch (error) {
      console.error('Error updating activities:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar las actividades. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={null} />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Actualizar Ubicaciones de Actividades
            </CardTitle>
            <CardDescription>
              Esta página actualiza las actividades existentes con ciudad, provincia y coordenadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!updated ? (
              <>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">Actividades a actualizar:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Paseo por el Retiro → Madrid, Madrid</li>
                    <li>Taller de Pintura → Igualada, Barcelona</li>
                    <li>Café y Tertulia → Igualada, Barcelona</li>
                    <li>Yoga Suave → Igualada, Barcelona</li>
                  </ul>
                </div>

                <Button 
                  onClick={updateActivities} 
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Actualizar Actividades
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
                  <p className="font-semibold">✓ Actividades actualizadas correctamente</p>
                  <p className="text-sm mt-1">
                    Todas las actividades ahora tienen ciudad, provincia y coordenadas.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="w-full"
                >
                  Volver al inicio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
