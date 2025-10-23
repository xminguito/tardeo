import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<any[]>([]);

  useEffect(() => {
    // Inicializar reconocimiento de voz
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        // Detener el micrófono automáticamente después de capturar la voz
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
        }
        await handleVoiceInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          toast({
            title: "No te escuché",
            description: "Intenta hablar más cerca del micrófono 🎤",
          });
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleVoiceInput = async (text: string) => {
    const userMessage = { role: "user", content: text };
    messagesRef.current.push(userMessage);
    setMessages([...messagesRef.current]);

    try {
      // Get user session (optional)
      const { data: { session } } = await supabase.auth.getSession();
      // Continuamos incluso sin sesión; si hay token lo añadimos, si no, llamamos como invitado.

      // Llamada directa al Edge Function con JWT del usuario (si está disponible)
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y293ZW5nc25udWdseXJqdXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjkyNTAsImV4cCI6MjA3Njc0NTI1MH0.ZwhhjRJgTKl3NQuTXy0unk2DFIDDjxi7T4zLN8EVyi0",
      };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const response = await fetch(
        "https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/voice-chat",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ messages: messagesRef.current }),
        }
      );

      if (response.status === 401) {
        toast({
          title: "Sesión expirada",
          description: "Vuelve a iniciar sesión para usar el asistente",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Error en la respuesta");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      setIsSpeaking(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
              }
            } catch (e) {
              // Ignorar errores de parsing
            }
          }
        }
      }

      if (assistantMessage) {
        const assistantMsg = { role: "assistant", content: assistantMessage };
        messagesRef.current.push(assistantMsg);
        setMessages([...messagesRef.current]);
        // No llamamos a speakText - el audio ya viene del Edge Function
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No pude procesar tu solicitud",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Obtener voces disponibles
      const voices = window.speechSynthesis.getVoices();
      
      // Buscar una voz en español más natural (preferir voces de Google o mejoradas)
      const spanishVoice = voices.find(voice => 
        voice.lang.startsWith('es') && 
        (voice.name.includes('Google') || voice.name.includes('Premium') || voice.name.includes('Enhanced'))
      ) || voices.find(voice => voice.lang.startsWith('es'));

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0; // Velocidad normal
      utterance.pitch = 1.1; // Tono ligeramente más alto para sonar más amigable
      utterance.volume = 1.0; // Volumen máximo
      
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "No disponible",
        description: "Tu navegador no soporta reconocimiento de voz",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast({
        title: "Asistente desactivado",
        description: "Hasta pronto 👋",
      });
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "Asistente activado",
        description: "Estoy escuchando... 🎤",
      });
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
      <Dialog open={showConversation} onOpenChange={setShowConversation}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-16 h-16 shadow-xl"
          >
            <MessageSquare className="h-8 w-8" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Conversación con el Asistente</DialogTitle>
            <DialogDescription>
              Historial de tu conversación de voz
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aún no hay mensajes. Activa el asistente para comenzar 🎤
                </p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary/10 ml-8"
                        : "bg-secondary mr-8"
                    }`}
                  >
                    <p className="font-semibold mb-1">
                      {msg.role === "user" ? "Tú" : "Asistente"}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Button
        onClick={toggleListening}
        size="lg"
        className={`rounded-full w-20 h-20 shadow-2xl transition-all duration-300 ${
          isListening || isSpeaking
            ? "bg-accent hover:bg-accent/90 animate-pulse"
            : "bg-primary hover:bg-primary/90"
        }`}
      >
        {isListening ? (
          <MicOff className="h-10 w-10" />
        ) : (
          <Mic className="h-10 w-10" />
        )}
      </Button>
    </div>
  );
};

export default VoiceAssistant;
