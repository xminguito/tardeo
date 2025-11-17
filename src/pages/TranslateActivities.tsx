import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Languages, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';

export default function TranslateActivities() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleBatchTranslate = async () => {
    setIsTranslating(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('batch-translate-activities');

      if (error) {
        throw error;
      }

      setResults(data.results);

      if (data.results.successful > 0) {
        toast({
          title: '✅ Traducción completada',
          description: `Se tradujeron ${data.results.successful} de ${data.results.total} actividades`,
        });
      }

      if (data.results.failed > 0) {
        toast({
          title: '⚠️ Algunas traducciones fallaron',
          description: `${data.results.failed} actividades no pudieron traducirse`,
          variant: 'destructive',
        });
      }

      if (data.results.total === 0) {
        toast({
          title: 'ℹ️ No hay actividades por traducir',
          description: 'Todas las actividades ya están traducidas',
        });
      }

    } catch (error) {
      console.error('Error in batch translation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al traducir actividades',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al admin
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Languages className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Traducir actividades existentes</CardTitle>
                <CardDescription>
                  Traduce automáticamente todas las actividades que solo tienen texto en español
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                Este proceso buscará todas las actividades que tienen título y descripción en español
                pero no en otros idiomas, y las traducirá automáticamente a inglés, catalán, francés, 
                italiano y alemán usando Lovable AI.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleBatchTranslate}
              disabled={isTranslating}
              size="lg"
              className="w-full"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Traduciendo actividades...
                </>
              ) : (
                <>
                  <Languages className="mr-2 h-5 w-5" />
                  Iniciar traducción automática
                </>
              )}
            </Button>

            {results && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{results.total}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <p className="text-2xl font-bold">{results.successful}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Exitosas</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <p className="text-2xl font-bold">{results.failed}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Fallidas</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {results.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-semibold mb-2">Errores:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {results.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {results.errors.length > 5 && (
                          <li>... y {results.errors.length - 5} errores más</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
