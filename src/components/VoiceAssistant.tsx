import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@11labs/react";
import type { VoiceToolsMap } from '@/features/activities/types/voiceTools.types';

interface VoiceAssistantProps {
  clientTools: VoiceToolsMap;
}

const VoiceAssistant = ({ clientTools }: VoiceAssistantProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  
  const conversation = useConversation({
    clientTools: {
      searchActivities: clientTools.searchActivities,
      reserveActivity: clientTools.reserveActivity,
      getActivityDetails: clientTools.getActivityDetails,
      suggestActivities: clientTools.suggestActivities,
      setFilter: clientTools.setFilter,
      clearFilters: clientTools.clearFilters,
      getMyReservations: clientTools.getMyReservations,
    },
    onConnect: () => {
      setIsConnecting(false);
      toast({
        title: "Asistente conectado",
        description: "Puedes empezar a hablar 🎤",
      });
    },
    onDisconnect: () => {
      toast({
        title: "Asistente desconectado",
        description: "Hasta pronto 👋",
      });
    },
    onError: (error) => {
      console.error("Error en conversación:", error);
      setIsConnecting(false);
      toast({
        title: "Error",
        description: "No pude conectar con el asistente",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Solicitar permisos de micrófono al cargar
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      toast({
        title: "Permisos necesarios",
        description: "Necesito acceso al micrófono para funcionar",
        variant: "destructive",
      });
    });
  }, []);

  const startConversation = async () => {
    try {
      setIsConnecting(true);

      // Obtener signed URL desde nuestro edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url');
      
      if (error || !data?.signedUrl) {
        throw new Error('No se pudo obtener la URL de conexión');
      }

      console.log('Iniciando conversación con ElevenLabs...');
      await conversation.startSession({ 
        signedUrl: data.signedUrl 
      });
    } catch (error) {
      console.error('Error al iniciar conversación:', error);
      setIsConnecting(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No pude iniciar la conversación",
        variant: "destructive",
      });
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Error al terminar conversación:', error);
    }
  };

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {!isConnected && !isConnecting ? (
        <Button
          onClick={startConversation}
          size="lg"
          className="rounded-full w-20 h-20 shadow-2xl bg-primary hover:bg-primary/90"
        >
          <Mic className="h-10 w-10" />
        </Button>
      ) : isConnecting ? (
        <Button
          disabled
          size="lg"
          className="rounded-full w-20 h-20 shadow-2xl"
        >
          <Loader2 className="h-10 w-10 animate-spin" />
        </Button>
      ) : (
        <Button
          onClick={endConversation}
          size="lg"
          className={`rounded-full w-20 h-20 shadow-2xl transition-all duration-300 ${
            isSpeaking
              ? "bg-accent hover:bg-accent/90 animate-pulse"
              : "bg-primary hover:bg-primary/90"
          }`}
        >
          <MicOff className="h-10 w-10" />
        </Button>
      )}
    </div>
  );
};

export default VoiceAssistant;
