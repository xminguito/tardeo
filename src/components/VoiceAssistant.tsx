import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@11labs/react";
import type { VoiceToolsMap } from '@/features/activities/types/voiceTools.types';
import ConversationHistory from "./ConversationHistory";
import { useTranslation } from "react-i18next";
import { VoiceMetricsTracker } from "@/lib/tts/voiceMetricsTracker";
import { useAnalytics } from "@/lib/analytics/useAnalytics";

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTextMessageLoading, setIsTextMessageLoading] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  
  const conversation = useConversation({
    clientTools: {
      searchActivities: async (params: any) => {
        const startTime = Date.now();
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] searchActivities called with:', params);
        }
        try {
          const result = await clientTools.searchActivities(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] searchActivities result:', result);
          }
          
          // Analytics: Track assistant_used_tool { tool_name, success: true, duration_ms }
          track('assistant_used_tool', {
            tool_name: 'searchActivities',
            success: true,
            duration_ms: Date.now() - startTime,
          });
          
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] searchActivities error:', error);
          }
          
          // Analytics: Track assistant_used_tool { tool_name, success: false }
          track('assistant_used_tool', {
            tool_name: 'searchActivities',
            success: false,
          });
          
          return t('voice.errors.searchActivities');
        }
      },
      reserveActivity: async (params: any) => {
        const startTime = Date.now();
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] reserveActivity called with:', params);
        }
        try {
          const result = await clientTools.reserveActivity(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] reserveActivity result:', result);
          }
          
          // Analytics: Track assistant_used_tool { tool_name, success: true, duration_ms }
          track('assistant_used_tool', {
            tool_name: 'reserveActivity',
            success: true,
            duration_ms: Date.now() - startTime,
          });
          
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] reserveActivity error:', error);
          }
          
          // Analytics: Track assistant_used_tool { tool_name, success: false }
          track('assistant_used_tool', {
            tool_name: 'reserveActivity',
            success: false,
          });
          
          return t('voice.errors.reserveActivity');
        }
      },
      getActivityDetails: async (params: any) => {
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] getActivityDetails called with:', params);
        }
        try {
          const result = await clientTools.getActivityDetails(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] getActivityDetails result:', result);
          }
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] getActivityDetails error:', error);
          }
          return t('voice.errors.getDetails');
        }
      },
      suggestActivities: async (params: any) => {
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] suggestActivities called with:', params);
        }
        try {
          const result = await clientTools.suggestActivities(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] suggestActivities result:', result);
          }
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] suggestActivities error:', error);
          }
          return t('voice.errors.suggestActivities');
        }
      },
      navigateToActivities: async (params: any) => {
        const startTime = Date.now();
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] navigateToActivities called with:', params);
        }
        try {
          const result = await clientTools.navigateToActivities(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] navigateToActivities result:', result);
          }
          
          // Analytics: Track assistant_used_tool { tool_name, success: true, duration_ms }
          track('assistant_used_tool', {
            tool_name: 'navigateToActivities',
            success: true,
            duration_ms: Date.now() - startTime,
          });
          
          // Analytics: Track assistant_action_navigate with target route
          track('assistant_action_navigate', {
            target_route: '/actividades',
            category: params?.category || null,
          });
          
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] navigateToActivities error:', error);
          }
          
          // Analytics: Track assistant_used_tool { tool_name, success: false }
          track('assistant_used_tool', {
            tool_name: 'navigateToActivities',
            success: false,
          });
          
          return t('voice.errors.navigate');
        }
      },
      setFilter: async (params: any) => {
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] setFilter called with:', params);
        }
        try {
          const result = await clientTools.setFilter(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] setFilter result:', result);
          }
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] setFilter error:', error);
          }
          return t('voice.errors.applyFilter');
        }
      },
      clearFilters: async () => {
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] clearFilters called');
        }
        try {
          const result = await clientTools.clearFilters();
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] clearFilters result:', result);
          }
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] clearFilters error:', error);
          }
          return t('voice.errors.clearFilters');
        }
      },
      getMyReservations: async () => {
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] getMyReservations called');
        }
        try {
          const result = await clientTools.getMyReservations();
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] getMyReservations result:', result);
          }
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] getMyReservations error:', error);
          }
          return t('voice.errors.getReservations');
        }
      },
      submitRating: async (params: any) => {
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] submitRating called with:', params);
        }
        try {
          const result = await clientTools.submitRating(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] submitRating result:', result);
          }
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] submitRating error:', error);
          }
          return t('voice.errors.submitRating');
        }
      },
      getRatings: async (params: any) => {
        if (import.meta.env.DEV) {
          console.log('[Voice Tool Wrapper] getRatings called with:', params);
        }
        try {
          const result = await clientTools.getRatings(params);
          if (import.meta.env.DEV) {
            console.log('[Voice Tool Wrapper] getRatings result:', result);
          }
          return result;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[Voice Tool Wrapper] getRatings error:', error);
          }
          return t('voice.errors.getRatings');
        }
      },
    },
    onConnect: () => {
      setIsConnecting(false);
      
      // Show popup immediately when connected
      setShowHistory(true);
      
      // Add welcome message from assistant
      const welcomeMessage: Message = {
        role: 'assistant',
        content: t('voice.welcome', 'Hola, ¿en qué puedo ayudarte? Puedes hablar o escribir un mensaje.'),
        timestamp: Date.now()
      };
      setMessages([welcomeMessage]);
      
      // Reset session and create new session ID for metrics tracking
      VoiceMetricsTracker.resetSession();
      const newSessionId = VoiceMetricsTracker.getSessionId();
      setSessionId(newSessionId);
      
      if (import.meta.env.DEV) {
        console.log('[VoiceAssistant] New session started:', newSessionId);
      }
      
      // Analytics: Track assistant_invoked { mode: 'voice' }
      track('assistant_invoked', {
        mode: 'voice',
      });
      
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
      if (import.meta.env.DEV) {
        console.log('Mensaje recibido:', message);
      }
      
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
        
        // Track voice response metrics
        if (sessionId && message.message) {
          VoiceMetricsTracker.trackResponse({
            sessionId,
            intent: 'ai_response',
            responseText: message.message,
            language: i18n.language,
            ttsProvider: 'elevenlabs',
          }).catch(err => {
            if (import.meta.env.DEV) {
              console.error('[VoiceAssistant] Failed to track metrics:', err);
            }
          });
        }
      }
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error("Error en conversación:", error);
      }
      setIsConnecting(false);
      
      // Analytics: Track assistant_failure { error_code }
      track('assistant_failure', {
        error_code: 'connection_error',
      });
      
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

      if (import.meta.env.DEV) {
        console.log('Iniciando conversación con ElevenLabs...');
      }
      await conversation.startSession({
        signedUrl: data.signedUrl,
        overrides: {
          agent: {
            language: currentLanguage,
          },
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error al iniciar conversación:', error);
      }
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
      if (import.meta.env.DEV) {
        console.error('Error al terminar conversación:', error);
      }
    }
  };

  const handleSendTextMessage = async (text: string) => {
    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTextMessageLoading(true);

    // Analytics: Track assistant_invoked { mode: 'text' }
    track('assistant_invoked', {
      mode: 'text',
    });

    // Temporarily disconnect ElevenLabs to prevent audio response
    const wasConnected = conversation.status === 'connected';
    if (wasConnected) {
      try {
        await conversation.endSession();
        if (import.meta.env.DEV) {
          console.log('[VoiceAssistant] Disconnected voice for text-only response');
        }
        
        // Show a subtle toast that voice was disconnected
        toast({
          title: t('voice.toast.textMode', 'Modo texto'),
          description: t('voice.toast.textModeDesc', 'Respuesta sin audio. Presiona 🎙️ para activar voz.'),
          duration: 2000,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[VoiceAssistant] Error disconnecting voice:', error);
        }
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send text message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let navigationPath: string | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  assistantMessage += content;
                  
                  // Clean the message for display (remove any NAVIGATE commands)
                  const displayMessage = assistantMessage
                    .replace(/\[NAVIGATE:[^\]]+\]/g, '')
                    .replace(/\s*\.\s*$/, '.')  // Clean up trailing dots/spaces
                    .trim();
                  
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === 'assistant') {
                      return prev.slice(0, -1).concat({
                        ...lastMsg,
                        content: displayMessage
                      });
                    } else {
                      return [...prev, {
                        role: 'assistant',
                        content: displayMessage,
                        timestamp: Date.now()
                      }];
                    }
                  });
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
        
        // After stream ends, check for navigation command in complete message
        const navMatch = assistantMessage.match(/\[NAVIGATE:([^\]]+)\]/);
        if (navMatch) {
          navigationPath = navMatch[1];
        }
      }
      
      // Navigate after message is fully displayed
      if (navigationPath) {
        setTimeout(() => {
          navigate(navigationPath!);
          toast({
            title: t('voice.toast.navigating', 'Navegando...'),
            description: t('voice.toast.navigatingDesc', 'Te llevo a la actividad'),
          });
        }, 1500);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error sending text message:', error);
      }
      
      // Analytics: Track assistant_failure { error_code }
      track('assistant_failure', {
        error_code: 'text_message_error',
      });
      
      toast({
        title: t('voice.toast.error'),
        description: t('voice.errors.textMessage', 'No se pudo enviar el mensaje'),
        variant: "destructive",
      });
    } finally {
      setIsTextMessageLoading(false);
    }
  };

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  // Abre el chat en modo texto sin activar la voz
  const openTextChat = () => {
    if (messages.length === 0) {
      // Añadir mensaje de bienvenida solo si es la primera vez
      const welcomeMessage: Message = {
        role: 'assistant',
        content: t('voice.welcomeText', '¡Hola! ¿En qué puedo ayudarte hoy?'),
        timestamp: Date.now()
      };
      setMessages([welcomeMessage]);
    }
    setShowHistory(true);
    
    // Analytics: Track assistant opened in text mode
    track('assistant_invoked', {
      mode: 'text_open',
    });
  };

  return (
    <>
      <ConversationHistory 
        messages={messages} 
        isVisible={showHistory || conversation.status === 'connected'}
        onClose={() => setShowHistory(false)}
        onSendTextMessage={handleSendTextMessage}
        isTextMessageLoading={isTextMessageLoading}
      />
      
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 items-end">
        {messages.length > 0 && (
          <div className="flex flex-col gap-2 items-end">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              size="sm"
              variant="secondary"
              className="rounded-full shadow-lg"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showHistory ? t('voice.hideChat', 'Ocultar') : t('voice.showChat', 'Ver chat')}
            </Button>
            
            {showHistory && !isConnected && !isConnecting && (
              <Button
                onClick={startConversation}
                size="sm"
                variant="outline"
                className="text-xs bg-background/90 px-3 py-2 rounded-full shadow-lg border hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                💬 Modo texto · Presiona 🎙️ para voz
              </Button>
            )}
          </div>
        )}
        
        {!isConnected && !isConnecting ? (
          <Button
            onClick={openTextChat}
            size="lg"
            className="rounded-full w-20 h-20 shadow-2xl bg-primary hover:bg-primary/90"
          >
            <MessageSquare className="h-10 w-10" />
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
