import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('appLanguage', language);
    localStorage.setItem('voiceAssistantLanguage', language);
    
    toast({
      title: t('activities.voice.selectLanguage'),
      description: `${t(`activities.voice.languages.${language}`)}`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4" />
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[140px] bg-background/20 border-primary-foreground/20 text-primary-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="es">{t('activities.voice.languages.es')}</SelectItem>
          <SelectItem value="en">{t('activities.voice.languages.en')}</SelectItem>
          <SelectItem value="ca">{t('activities.voice.languages.ca')}</SelectItem>
          <SelectItem value="fr">{t('activities.voice.languages.fr')}</SelectItem>
          <SelectItem value="it">{t('activities.voice.languages.it')}</SelectItem>
          <SelectItem value="de">{t('activities.voice.languages.de')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
