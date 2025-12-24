import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Language configuration map
const LANGUAGES = {
  es: { flag: '🇪🇸', label: 'ES', name: 'Español' },
  en: { flag: '🇬🇧', label: 'EN', name: 'English' },
  ca: { flag: '🏴', label: 'CA', name: 'Català' },
  fr: { flag: '🇫🇷', label: 'FR', name: 'Français' },
  it: { flag: '🇮🇹', label: 'IT', name: 'Italiano' },
  de: { flag: '🇩🇪', label: 'DE', name: 'Deutsch' },
} as const;

type LanguageCode = keyof typeof LANGUAGES;

const LanguageSelector = ({
  inMobileMenu = false
}: {
  inMobileMenu?: boolean;
}) => {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  
  const currentLang = (i18n.language as LanguageCode) || 'es';
  const currentConfig = LANGUAGES[currentLang] || LANGUAGES.es;

  const handleLanguageChange = (language: LanguageCode) => {
    i18n.changeLanguage(language);
    localStorage.setItem('appLanguage', language);
    localStorage.setItem('voiceAssistantLanguage', language);
    toast({
      title: t('activities.voice.selectLanguage'),
      description: LANGUAGES[language].name,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 px-2.5 font-medium",
            inMobileMenu 
              ? "bg-background border border-border text-foreground hover:bg-accent" 
              : "bg-background/20 text-primary-foreground hover:bg-background/30"
          )}
          aria-label={`${t('common.changeLanguage', 'Cambiar idioma')}: ${currentConfig.name}`}
        >
          <span className="text-base">{currentConfig.flag}</span>
          <span className="text-sm">{currentConfig.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {(Object.entries(LANGUAGES) as [LanguageCode, typeof LANGUAGES[LanguageCode]][]).map(
          ([code, config]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                currentLang === code && "bg-accent"
              )}
            >
              <span className="text-base">{config.flag}</span>
              <span className="font-medium">{config.label}</span>
              <span className="text-muted-foreground text-sm ml-1">{config.name}</span>
              {currentLang === code && (
                <Check className="h-4 w-4 ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
