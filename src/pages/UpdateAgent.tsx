import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, Settings2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/PageHeader";

const UpdateAgent = () => {
  const [agentId, setAgentId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!agentId.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el ID del agente",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    setStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke("update-elevenlabs-agent", {
        body: { agentId: agentId.trim() },
      });

      if (error) throw error;

      if (data.success) {
        setStatus("success");
        toast({
          title: "¡Éxito!",
          description: "La configuración del agente se actualizó correctamente",
        });
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error updating agent:", error);
      setStatus("error");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el agente",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <PageHeader
          title="Actualizar Agente de ElevenLabs"
          icon={<Settings2 className="h-10 w-10 text-primary" />}
        />

        <Card>
          <CardHeader>
            <CardDescription>
              Actualiza automáticamente la configuración de las herramientas del agente con descripciones optimizadas en inglés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="agentId" className="text-sm font-medium">
                Agent ID
              </label>
              <Input
                id="agentId"
                placeholder="Ingresa el ID del agente de ElevenLabs"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground">
                Puedes encontrar el Agent ID en la URL de configuración de tu agente en ElevenLabs
              </p>
            </div>

            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating || !agentId.trim()}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar Configuración"
              )}
            </Button>

            {status === "success" && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="text-sm text-green-800 dark:text-green-200">
                  <p className="font-medium">Configuración actualizada</p>
                  <p className="text-xs mt-1">
                    Todas las herramientas ahora tienen descripciones optimizadas en inglés
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-medium">Error al actualizar</p>
                  <p className="text-xs mt-1">
                    Verifica que el Agent ID sea correcto y que tengas configurado ELEVENLABS_API_KEY
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Herramientas que se actualizarán:</h3>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• searchActivities - Buscar actividades por nombre o filtros</li>
                <li>• getActivityDetails - Ver detalles de una actividad</li>
                <li>• reserveActivity - Reservar plaza en actividad</li>
                <li>• navigateToActivities - Navegar a lista de actividades</li>
                <li>• setFilter - Aplicar filtros de búsqueda</li>
                <li>• clearFilters - Limpiar filtros</li>
                <li>• getMyReservations - Ver reservas del usuario</li>
                <li>• suggestActivities - Recomendaciones personalizadas</li>
                <li>• submitRating - Valorar actividad</li>
                <li>• getRatings - Ver valoraciones</li>
                <li className="text-primary font-medium">• searchCommunities - 🆕 Buscar comunidades/grupos</li>
                <li className="text-primary font-medium">• navigateToCommunities - 🆕 Ir a comunidades</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default UpdateAgent;
