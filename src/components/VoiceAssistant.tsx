import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@11labs/react";
import type { VoiceToolsMap } from '@/features/activities/types/voiceTools.types';
import ConversationHistory from "./ConversationHistory";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface VoiceAssistantProps {
  clientTools: VoiceToolsMap;
}

const VoiceAssistant = ({ clientTools }: VoiceAssistantProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  
  const conversation = useConversation({
    clientTools: {
      searchActivities: clientTools.searchActivities,
      reserveActivity: clientTools.reserveActivity,
      getActivityDetails: clientTools.getActivityDetails,
      suggestActivities: clientTools.suggestActivities,
      navigateToActivities: clientTools.navigateToActivities,
      setFilter: clientTools.setFilter,
      clearFilters: clientTools.clearFilters,
      getMyReservations: clientTools.getMyReservations,
      submitRating: clientTools.submitRating,
      getRatings: clientTools.getRatings,
    },
    onConnect: () => {
      setIsConnecting(false);
      setMessages([]);
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
    onMessage: (message) => {
      console.log('Mensaje recibido:', message);
      
      // Capturar transcripciones del usuario y respuestas del asistente
      if (message.source === 'user' && message.message) {
        setMessages(prev => [...prev, {
          role: 'user',
          content: message.message,
          timestamp: Date.now()
        }]);
      } else if (message.source === 'ai' && message.message) {
        setMessages(prev => {
          // Actualizar o añadir mensaje del asistente
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant') {
            // Actualizar el último mensaje del asistente
            return prev.slice(0, -1).concat({
              ...lastMessage,
              content: message.message
            });
          } else {
            // Añadir nuevo mensaje del asistente
            return [...prev, {
              role: 'assistant',
              content: message.message,
              timestamp: Date.now()
            }];
          }
        });
      }
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
    <>
      <ConversationHistory messages={messages} isVisible={isConnected && showHistory} />
      
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 items-end">
        {isConnected && messages.length > 0 && (
          <Button
            onClick={() => setShowHistory(!showHistory)}
            size="sm"
            variant="secondary"
            className="rounded-full shadow-lg"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showHistory ? 'Ocultar' : 'Ver chat'}
          </Button>
        )}
        
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
    </>
  );
};

export default VoiceAssistant;
