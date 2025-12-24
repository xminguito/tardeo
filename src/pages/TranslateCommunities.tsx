import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Languages, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';

export default function TranslateCommunities() {
  const { toast } = useToast();
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
      const { data, error } = await supabase.functions.invoke('batch-translate-communities');

      if (error) {
        throw error;
      }

      setResults(data.results);

      if (data.results.successful > 0) {
        toast({
          title: '✅ Traducción completada',
          description: `Se tradujeron ${data.results.successful} de ${data.results.total} comunidades`,
        });
      }

      if (data.results.failed > 0) {
        toast({
          title: '⚠️ Algunas traducciones fallaron',
          description: `${data.results.failed} comunidades no pudieron traducirse`,
          variant: 'destructive',
        });
      }

      if (data.results.total === 0) {
        toast({
          title: 'ℹ️ No hay comunidades por traducir',
          description: 'Todas las comunidades ya están traducidas',
        });
      }

    } catch (error) {
      console.error('Error in batch translation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al traducir comunidades',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <PageHeader
          title="Traducir comunidades existentes"
          icon={<Languages className="h-10 w-10 text-primary" />}
        />

        <Card>
          <CardHeader>
            <CardDescription>
              Traduce automáticamente todas las comunidades que solo tienen texto en español
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                Este proceso buscará todas las comunidades que tienen nombre y descripción en español
                pero no en otros idiomas, y las traducirá automáticamente a inglés, catalán, francés, 
                italiano y alemán usando IA.
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
                  Traduciendo comunidades...
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
    </PageTransition>
  );
}

