import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const toggleListening = () => {
    setIsListening(!isListening);
    
    if (!isListening) {
      toast({
        title: "Asistente activado",
        description: "Puedes hablarme ahora 🎤",
      });
    } else {
      toast({
        title: "Asistente desactivado",
        description: "Hasta pronto 👋",
      });
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Button
        onClick={toggleListening}
        size="lg"
        className={`rounded-full w-20 h-20 shadow-2xl transition-all duration-300 ${
          isListening
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
