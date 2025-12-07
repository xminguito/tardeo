import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, Download, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

export default function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt, 10));
      const daysSinceDismiss = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_DAYS) {
        return;
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS instructions after a delay
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt (Android/Desktop Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay for better UX
      setTimeout(() => setIsVisible(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed');
        setIsVisible(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsVisible(false);
  };

  // Don't render if standalone or not visible
  if (isStandalone || !isVisible) {
    return null;
  }

  // Don't render if not iOS and no install prompt available
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-primary/95 to-primary/85 p-4 shadow-2xl backdrop-blur-xl">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>

          {isIOS ? (
            // iOS Instructions
            <div className="pr-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm">
                    {t('pwa.iosTitle')}
                  </h3>
                  <p className="mt-1 text-xs text-white/80 leading-relaxed">
                    {t('pwa.iosInstructions')}
                  </p>
                  
                  {/* Visual instructions */}
                  <div className="mt-3 flex items-center gap-2 text-white/90">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5">
                      <Share className="h-4 w-4" />
                      <span className="text-xs font-medium">{t('pwa.iosTapShare')}</span>
                    </div>
                    <span className="text-white/60">→</span>
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5">
                      <PlusSquare className="h-4 w-4" />
                      <span className="text-xs font-medium">{t('pwa.iosAddHome')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Android/Desktop Install Button
            <div className="flex items-center gap-3 pr-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm">
                  {t('pwa.installTitle')}
                </h3>
                <p className="text-xs text-white/80">
                  {t('pwa.installDescription')}
                </p>
              </div>
              <Button
                onClick={handleInstall}
                size="sm"
                className="shrink-0 bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
              >
                {t('pwa.installButton')}
              </Button>
            </div>
          )}

          {/* Decorative gradient */}
          <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </div>
      </div>
    </div>
  );
}
