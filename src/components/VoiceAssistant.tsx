import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@11labs/react";
import type { VoiceToolsMap } from '@/features/activities/types/voiceTools.types';
import ConversationHistory from "./ConversationHistory";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
  
  const conversation = useConversation({
    clientTools: {
      searchActivities: async (params: any) => {
        console.log('[Voice Tool Wrapper] searchActivities called with:', params);
        try {
          const result = await clientTools.searchActivities(params);
          console.log('[Voice Tool Wrapper] searchActivities result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] searchActivities error:', error);
          return t('voice.errors.searchActivities');
        }
      },
      reserveActivity: async (params: any) => {
        console.log('[Voice Tool Wrapper] reserveActivity called with:', params);
        try {
          const result = await clientTools.reserveActivity(params);
          console.log('[Voice Tool Wrapper] reserveActivity result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] reserveActivity error:', error);
          return t('voice.errors.reserveActivity');
        }
      },
      getActivityDetails: async (params: any) => {
        console.log('[Voice Tool Wrapper] getActivityDetails called with:', params);
        try {
          const result = await clientTools.getActivityDetails(params);
          console.log('[Voice Tool Wrapper] getActivityDetails result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] getActivityDetails error:', error);
          return t('voice.errors.getDetails');
        }
      },
      suggestActivities: async (params: any) => {
        console.log('[Voice Tool Wrapper] suggestActivities called with:', params);
        try {
          const result = await clientTools.suggestActivities(params);
          console.log('[Voice Tool Wrapper] suggestActivities result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] suggestActivities error:', error);
          return t('voice.errors.suggestActivities');
        }
      },
      navigateToActivities: async (params: any) => {
        console.log('[Voice Tool Wrapper] navigateToActivities called with:', params);
        try {
          const result = await clientTools.navigateToActivities(params);
          console.log('[Voice Tool Wrapper] navigateToActivities result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] navigateToActivities error:', error);
          return t('voice.errors.navigate');
        }
      },
      setFilter: async (params: any) => {
        console.log('[Voice Tool Wrapper] setFilter called with:', params);
        try {
          const result = await clientTools.setFilter(params);
          console.log('[Voice Tool Wrapper] setFilter result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] setFilter error:', error);
          return t('voice.errors.applyFilter');
        }
      },
      clearFilters: async () => {
        console.log('[Voice Tool Wrapper] clearFilters called');
        try {
          const result = await clientTools.clearFilters();
          console.log('[Voice Tool Wrapper] clearFilters result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] clearFilters error:', error);
          return t('voice.errors.clearFilters');
        }
      },
      getMyReservations: async () => {
        console.log('[Voice Tool Wrapper] getMyReservations called');
        try {
          const result = await clientTools.getMyReservations();
          console.log('[Voice Tool Wrapper] getMyReservations result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] getMyReservations error:', error);
          return t('voice.errors.getReservations');
        }
      },
      submitRating: async (params: any) => {
        console.log('[Voice Tool Wrapper] submitRating called with:', params);
        try {
          const result = await clientTools.submitRating(params);
          console.log('[Voice Tool Wrapper] submitRating result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] submitRating error:', error);
          return t('voice.errors.submitRating');
        }
      },
      getRatings: async (params: any) => {
        console.log('[Voice Tool Wrapper] getRatings called with:', params);
        try {
          const result = await clientTools.getRatings(params);
          console.log('[Voice Tool Wrapper] getRatings result:', result);
          return result;
        } catch (error) {
          console.error('[Voice Tool Wrapper] getRatings error:', error);
          return t('voice.errors.getRatings');
        }
      },
    },
    onConnect: () => {
      setIsConnecting(false);
      setMessages([]);
      toast({
        title: t('voice.toast.connected'),
        description: t('voice.toast.connectedDesc'),
      });
    },
    onDisconnect: () => {
      toast({
        title: t('voice.toast.disconnected'),
        description: t('voice.toast.disconnectedDesc'),
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
        title: t('voice.toast.error'),
        description: t('voice.toast.errorDesc'),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Solicitar permisos de micrófono al cargar
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      toast({
        title: t('voice.toast.micPermission'),
        description: t('voice.toast.micPermissionDesc'),
        variant: "destructive",
      });
    });
  }, []);

  const startConversation = async () => {
    try {
      setIsConnecting(true);

      // Obtener idioma actual de la app
      const currentLanguage = i18n.language || localStorage.getItem('appLanguage') || 'es';

      // Obtener signed URL desde nuestro edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url');
      
      if (error || !data?.signedUrl) {
        throw new Error('No se pudo obtener la URL de conexión');
      }

      console.log('Iniciando conversación con ElevenLabs...');
      await conversation.startSession({ 
        signedUrl: data.signedUrl,
        overrides: {
          agent: {
            language: currentLanguage,
          },
        },
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
      
      <div className="fixed bottom-8 right-4 md:right-8 z-50 flex flex-col gap-2 items-end">
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
            className="rounded-full w-16 h-16 md:w-20 md:h-20 shadow-2xl bg-primary hover:bg-primary/90"
          >
            <Mic className="h-8 w-8 md:h-10 md:w-10" />
          </Button>
        ) : isConnecting ? (
          <Button
            disabled
            size="lg"
            className="rounded-full w-16 h-16 md:w-20 md:h-20 shadow-2xl"
          >
            <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin" />
          </Button>
        ) : (
          <Button
            onClick={endConversation}
            size="lg"
            className={`rounded-full w-16 h-16 md:w-20 md:h-20 shadow-2xl transition-all duration-300 ${
              isSpeaking
                ? "bg-accent hover:bg-accent/90 animate-pulse"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            <MicOff className="h-8 w-8 md:h-10 md:w-10" />
          </Button>
        )}
      </div>
    </>
  );
};

export default VoiceAssistant;
