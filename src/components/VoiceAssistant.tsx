import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
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
    messagesRef.current.push({ role: "user", content: text });

    try {
      // Get user session for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para usar el asistente",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        "https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/voice-chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: messagesRef.current }),
        }
      );

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
        messagesRef.current.push({ role: "assistant", content: assistantMessage });
        speakText(assistantMessage);
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
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
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
    <div className="fixed bottom-8 right-8 z-50">
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
