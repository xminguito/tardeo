import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, Clock, Sparkles } from 'lucide-react';

interface ComingSoonSettings {
  enabled: boolean;
  username: string;
  password: string;
  title: string;
  subtitle: string;
  description: string;
  show_countdown: boolean;
  launch_date: string | null;
}

interface ComingSoonProps {
  settings: ComingSoonSettings;
  onAccessGranted: () => void;
}

export default function ComingSoon({ settings, onAccessGranted }: ComingSoonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Calculate countdown
  useEffect(() => {
    if (!settings.show_countdown || !settings.launch_date) return;

    const calculateCountdown = () => {
      const launchDate = new Date(settings.launch_date!).getTime();
      const now = new Date().getTime();
      const difference = launchDate - now;

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [settings.show_countdown, settings.launch_date]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple client-side validation (the password is already exposed in settings)
    setTimeout(() => {
      if (username === settings.username && password === settings.password) {
        // Store access in sessionStorage
        sessionStorage.setItem('coming_soon_access', 'granted');
        toast({
          title: t('comingSoon.accessGranted', '¡Acceso concedido!'),
          description: t('comingSoon.welcome', 'Bienvenido al sitio'),
        });
        onAccessGranted();
      } else {
        toast({
          title: t('comingSoon.invalidCredentials', 'Credenciales incorrectas'),
          description: t('comingSoon.tryAgain', 'Por favor, inténtalo de nuevo'),
          variant: 'destructive',
        });
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-8">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            {settings.title || t('comingSoon.title', 'Próximamente')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            {settings.subtitle || t('comingSoon.subtitle', 'Estamos trabajando en algo increíble')}
          </p>
        </div>

        {/* Description */}
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          {settings.description || t('comingSoon.description', 'Muy pronto podrás descubrir actividades y conectar con personas que comparten tus intereses.')}
        </p>

        {/* Countdown */}
        {settings.show_countdown && settings.launch_date && (
          <div className="flex justify-center gap-4 md:gap-6">
            {[
              { value: countdown.days, label: t('comingSoon.days', 'Días') },
              { value: countdown.hours, label: t('comingSoon.hours', 'Horas') },
              { value: countdown.minutes, label: t('comingSoon.minutes', 'Min') },
              { value: countdown.seconds, label: t('comingSoon.seconds', 'Seg') },
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-card border rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl md:text-3xl font-bold text-primary">
                    {item.value.toString().padStart(2, '0')}
                  </span>
                </div>
                <span className="text-xs md:text-sm text-muted-foreground mt-2">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Login Section */}
        {!showLogin ? (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowLogin(true)}
            className="gap-2"
          >
            <Lock className="w-4 h-4" />
            {t('comingSoon.accessButton', 'Acceso anticipado')}
          </Button>
        ) : (
          <Card className="max-w-sm mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Unlock className="w-5 h-5" />
                {t('comingSoon.loginTitle', 'Acceso anticipado')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('comingSoon.username', 'Usuario')}</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('comingSoon.usernamePlaceholder', 'Introduce tu usuario')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('comingSoon.password', 'Contraseña')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('comingSoon.passwordPlaceholder', 'Introduce tu contraseña')}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowLogin(false)}
                    className="flex-1"
                  >
                    {t('common.cancel', 'Cancelar')}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? t('common.loading', 'Cargando...') : t('comingSoon.enter', 'Entrar')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="pt-8 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            {t('comingSoon.patience', 'Gracias por tu paciencia')}
          </p>
        </div>
      </div>
    </div>
  );
}

