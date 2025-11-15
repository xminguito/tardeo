import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './es';
import en from './en';
import ca from './ca';
import fr from './fr';
import it from './it';
import de from './de';

// Cargar idioma guardado o usar español por defecto
const savedLanguage = localStorage.getItem('appLanguage') || 'es';

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    ca: { translation: ca },
    fr: { translation: fr },
    it: { translation: it },
    de: { translation: de },
  },
  lng: savedLanguage,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

