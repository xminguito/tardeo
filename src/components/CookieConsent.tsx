import { useEffect } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import '@/styles/cookieconsent-custom.css';
import { useTranslation } from 'react-i18next';

export const CookieConsentComponent = () => {
  const { i18n, t } = useTranslation();

  useEffect(() => {
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
        default: i18n.language,
        autoDetect: 'document',
        
        translations: {
          es: {
            consentModal: {
              title: t('cookies.modal.title'),
              description: t('cookies.modal.description'),
              acceptAllBtn: t('cookies.modal.acceptAll'),
              acceptNecessaryBtn: t('cookies.modal.acceptNecessary'),
              showPreferencesBtn: t('cookies.modal.showPreferences'),
            },
            preferencesModal: {
              title: t('cookies.preferences.title'),
              acceptAllBtn: t('cookies.preferences.acceptAll'),
              acceptNecessaryBtn: t('cookies.preferences.acceptNecessary'),
              savePreferencesBtn: t('cookies.preferences.save'),
              closeIconLabel: t('cookies.preferences.close'),
              sections: [
                {
                  title: t('cookies.preferences.usage.title'),
                  description: t('cookies.preferences.usage.description'),
                },
                {
                  title: t('cookies.preferences.necessary.title'),
                  description: t('cookies.preferences.necessary.description'),
                  linkedCategory: 'necessary',
                },
                {
                  title: t('cookies.preferences.analytics.title'),
                  description: t('cookies.preferences.analytics.description'),
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
          ca: {
            consentModal: {
              title: t('cookies.modal.title', { lng: 'ca' }),
              description: t('cookies.modal.description', { lng: 'ca' }),
              acceptAllBtn: t('cookies.modal.acceptAll', { lng: 'ca' }),
              acceptNecessaryBtn: t('cookies.modal.acceptNecessary', { lng: 'ca' }),
              showPreferencesBtn: t('cookies.modal.showPreferences', { lng: 'ca' }),
            },
            preferencesModal: {
              title: t('cookies.preferences.title', { lng: 'ca' }),
              acceptAllBtn: t('cookies.preferences.acceptAll', { lng: 'ca' }),
              acceptNecessaryBtn: t('cookies.preferences.acceptNecessary', { lng: 'ca' }),
              savePreferencesBtn: t('cookies.preferences.save', { lng: 'ca' }),
              closeIconLabel: t('cookies.preferences.close', { lng: 'ca' }),
              sections: [
                {
                  title: t('cookies.preferences.usage.title', { lng: 'ca' }),
                  description: t('cookies.preferences.usage.description', { lng: 'ca' }),
                },
                {
                  title: t('cookies.preferences.necessary.title', { lng: 'ca' }),
                  description: t('cookies.preferences.necessary.description', { lng: 'ca' }),
                  linkedCategory: 'necessary',
                },
                {
                  title: t('cookies.preferences.analytics.title', { lng: 'ca' }),
                  description: t('cookies.preferences.analytics.description', { lng: 'ca' }),
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
          en: {
            consentModal: {
              title: t('cookies.modal.title', { lng: 'en' }),
              description: t('cookies.modal.description', { lng: 'en' }),
              acceptAllBtn: t('cookies.modal.acceptAll', { lng: 'en' }),
              acceptNecessaryBtn: t('cookies.modal.acceptNecessary', { lng: 'en' }),
              showPreferencesBtn: t('cookies.modal.showPreferences', { lng: 'en' }),
            },
            preferencesModal: {
              title: t('cookies.preferences.title', { lng: 'en' }),
              acceptAllBtn: t('cookies.preferences.acceptAll', { lng: 'en' }),
              acceptNecessaryBtn: t('cookies.preferences.acceptNecessary', { lng: 'en' }),
              savePreferencesBtn: t('cookies.preferences.save', { lng: 'en' }),
              closeIconLabel: t('cookies.preferences.close', { lng: 'en' }),
              sections: [
                {
                  title: t('cookies.preferences.usage.title', { lng: 'en' }),
                  description: t('cookies.preferences.usage.description', { lng: 'en' }),
                },
                {
                  title: t('cookies.preferences.necessary.title', { lng: 'en' }),
                  description: t('cookies.preferences.necessary.description', { lng: 'en' }),
                  linkedCategory: 'necessary',
                },
                {
                  title: t('cookies.preferences.analytics.title', { lng: 'en' }),
                  description: t('cookies.preferences.analytics.description', { lng: 'en' }),
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
          fr: {
            consentModal: {
              title: t('cookies.modal.title', { lng: 'fr' }),
              description: t('cookies.modal.description', { lng: 'fr' }),
              acceptAllBtn: t('cookies.modal.acceptAll', { lng: 'fr' }),
              acceptNecessaryBtn: t('cookies.modal.acceptNecessary', { lng: 'fr' }),
              showPreferencesBtn: t('cookies.modal.showPreferences', { lng: 'fr' }),
            },
            preferencesModal: {
              title: t('cookies.preferences.title', { lng: 'fr' }),
              acceptAllBtn: t('cookies.preferences.acceptAll', { lng: 'fr' }),
              acceptNecessaryBtn: t('cookies.preferences.acceptNecessary', { lng: 'fr' }),
              savePreferencesBtn: t('cookies.preferences.save', { lng: 'fr' }),
              closeIconLabel: t('cookies.preferences.close', { lng: 'fr' }),
              sections: [
                {
                  title: t('cookies.preferences.usage.title', { lng: 'fr' }),
                  description: t('cookies.preferences.usage.description', { lng: 'fr' }),
                },
                {
                  title: t('cookies.preferences.necessary.title', { lng: 'fr' }),
                  description: t('cookies.preferences.necessary.description', { lng: 'fr' }),
                  linkedCategory: 'necessary',
                },
                {
                  title: t('cookies.preferences.analytics.title', { lng: 'fr' }),
                  description: t('cookies.preferences.analytics.description', { lng: 'fr' }),
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
          de: {
            consentModal: {
              title: t('cookies.modal.title', { lng: 'de' }),
              description: t('cookies.modal.description', { lng: 'de' }),
              acceptAllBtn: t('cookies.modal.acceptAll', { lng: 'de' }),
              acceptNecessaryBtn: t('cookies.modal.acceptNecessary', { lng: 'de' }),
              showPreferencesBtn: t('cookies.modal.showPreferences', { lng: 'de' }),
            },
            preferencesModal: {
              title: t('cookies.preferences.title', { lng: 'de' }),
              acceptAllBtn: t('cookies.preferences.acceptAll', { lng: 'de' }),
              acceptNecessaryBtn: t('cookies.preferences.acceptNecessary', { lng: 'de' }),
              savePreferencesBtn: t('cookies.preferences.save', { lng: 'de' }),
              closeIconLabel: t('cookies.preferences.close', { lng: 'de' }),
              sections: [
                {
                  title: t('cookies.preferences.usage.title', { lng: 'de' }),
                  description: t('cookies.preferences.usage.description', { lng: 'de' }),
                },
                {
                  title: t('cookies.preferences.necessary.title', { lng: 'de' }),
                  description: t('cookies.preferences.necessary.description', { lng: 'de' }),
                  linkedCategory: 'necessary',
                },
                {
                  title: t('cookies.preferences.analytics.title', { lng: 'de' }),
                  description: t('cookies.preferences.analytics.description', { lng: 'de' }),
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
          it: {
            consentModal: {
              title: t('cookies.modal.title', { lng: 'it' }),
              description: t('cookies.modal.description', { lng: 'it' }),
              acceptAllBtn: t('cookies.modal.acceptAll', { lng: 'it' }),
              acceptNecessaryBtn: t('cookies.modal.acceptNecessary', { lng: 'it' }),
              showPreferencesBtn: t('cookies.modal.showPreferences', { lng: 'it' }),
            },
            preferencesModal: {
              title: t('cookies.preferences.title', { lng: 'it' }),
              acceptAllBtn: t('cookies.preferences.acceptAll', { lng: 'it' }),
              acceptNecessaryBtn: t('cookies.preferences.acceptNecessary', { lng: 'it' }),
              savePreferencesBtn: t('cookies.preferences.save', { lng: 'it' }),
              closeIconLabel: t('cookies.preferences.close', { lng: 'it' }),
              sections: [
                {
                  title: t('cookies.preferences.usage.title', { lng: 'it' }),
                  description: t('cookies.preferences.usage.description', { lng: 'it' }),
                },
                {
                  title: t('cookies.preferences.necessary.title', { lng: 'it' }),
                  description: t('cookies.preferences.necessary.description', { lng: 'it' }),
                  linkedCategory: 'necessary',
                },
                {
                  title: t('cookies.preferences.analytics.title', { lng: 'it' }),
                  description: t('cookies.preferences.analytics.description', { lng: 'it' }),
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
        },
      },

      onConsent: () => {
        const consent = CookieConsent.getUserPreferences();
        
        // Si el usuario acepta analytics, habilitar Mixpanel
        if (consent.acceptedCategories.includes('analytics')) {
          // El módulo de analytics ya maneja opt-in/opt-out
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

    // Actualizar idioma cuando cambie
    const handleLanguageChange = () => {
      CookieConsent.setLanguage(i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, t]);

  return null;
};
