import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
const LanguageSelector = ({
  inMobileMenu = false
}: {
  inMobileMenu?: boolean;
}) => {
  const {
    i18n,
    t
  } = useTranslation();
  const {
    toast
  } = useToast();
  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('appLanguage', language);
    localStorage.setItem('voiceAssistantLanguage', language);
    toast({
      title: t('activities.voice.selectLanguage'),
      description: `${t(`activities.voice.languages.${language}`)}`
    });
  };
  return <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 w-full md:w-auto">
      
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className={`w-full md:w-[140px] text-sm md:text-base ${inMobileMenu ? 'bg-background border-border text-foreground' : 'bg-background/20 border-primary-foreground/20 text-primary-foreground'}`}>
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
    </div>;
};
export default LanguageSelector;