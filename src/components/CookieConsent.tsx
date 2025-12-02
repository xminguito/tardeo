import { useEffect, useRef } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import '@/styles/cookieconsent-custom.css';
import { useTranslation } from 'react-i18next';

// Helper to get translations for a specific language
const getTranslationsForLanguage = (t: (key: string, options?: any) => string, lng: string) => ({
  consentModal: {
    title: t('cookies.modal.title', { lng }),
    description: t('cookies.modal.description', { lng }),
    acceptAllBtn: t('cookies.modal.acceptAll', { lng }),
    acceptNecessaryBtn: t('cookies.modal.acceptNecessary', { lng }),
    showPreferencesBtn: t('cookies.modal.showPreferences', { lng }),
  },
  preferencesModal: {
    title: t('cookies.preferences.title', { lng }),
    acceptAllBtn: t('cookies.preferences.acceptAll', { lng }),
    acceptNecessaryBtn: t('cookies.preferences.acceptNecessary', { lng }),
    savePreferencesBtn: t('cookies.preferences.save', { lng }),
    closeIconLabel: t('cookies.preferences.close', { lng }),
    sections: [
      {
        title: t('cookies.preferences.usage.title', { lng }),
        description: t('cookies.preferences.usage.description', { lng }),
      },
      {
        title: t('cookies.preferences.necessary.title', { lng }),
        description: t('cookies.preferences.necessary.description', { lng }),
        linkedCategory: 'necessary',
      },
      {
        title: t('cookies.preferences.analytics.title', { lng }),
        description: t('cookies.preferences.analytics.description', { lng }),
        linkedCategory: 'analytics',
      },
    ],
  },
});

export const CookieConsentComponent = () => {
  const { i18n, t } = useTranslation();
  const initialized = useRef(false);

  // Initialize CookieConsent only once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Get saved language from localStorage (same as i18n config)
    const savedLanguage = localStorage.getItem('appLanguage') || 'es';

    CookieConsent.run({
      guiOptions: {
        consentModal: {
          layout: 'box inline',
          position: 'bottom left',
        },
        preferencesModal: {
          layout: 'box',
        },
      },
      
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        analytics: {
          enabled: false,
        },
      },

      language: {
        default: savedLanguage,
        autoDetect: 'document',
        
        translations: {
          es: getTranslationsForLanguage(t, 'es'),
          ca: getTranslationsForLanguage(t, 'ca'),
          en: getTranslationsForLanguage(t, 'en'),
          fr: getTranslationsForLanguage(t, 'fr'),
          de: getTranslationsForLanguage(t, 'de'),
          it: getTranslationsForLanguage(t, 'it'),
        },
      },

      onConsent: () => {
        const consent = CookieConsent.getUserPreferences();
        
        if (consent.acceptedCategories.includes('analytics')) {
          window.dispatchEvent(new CustomEvent('cookieconsentAccepted', { 
            detail: { analytics: true } 
          }));
        } else {
          window.dispatchEvent(new CustomEvent('cookieconsentAccepted', { 
            detail: { analytics: false } 
          }));
        }
      },

      onChange: () => {
        const consent = CookieConsent.getUserPreferences();
        
        if (consent.acceptedCategories.includes('analytics')) {
          window.dispatchEvent(new CustomEvent('cookieconsentChanged', { 
            detail: { analytics: true } 
          }));
        } else {
          window.dispatchEvent(new CustomEvent('cookieconsentChanged', { 
            detail: { analytics: false } 
          }));
        }
      },
    });

    // Set the language explicitly after initialization
    // This ensures the saved language is applied on page refresh
    setTimeout(() => {
      CookieConsent.setLanguage(savedLanguage);
    }, 0);
  }, [t]);

  // Handle language changes from the selector
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      CookieConsent.setLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  return null;
};
