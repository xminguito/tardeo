import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Instagram, Twitter, Github } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  const location = useLocation();

  // Hide footer on certain routes
  const hiddenRoutes = ['/auth', '/onboarding', '/admin'];
  const shouldHide = hiddenRoutes.some(route => location.pathname.startsWith(route));

  if (shouldHide) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border mt-auto">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Brand Column */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-primary mb-2">Tardeo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('footer.slogan', 'Encuentra tu plan ideal')}
            </p>
            <p className="text-xs text-muted-foreground">
              © {currentYear} Tardeo. {t('footer.rights', 'Todos los derechos reservados.')}
            </p>
          </div>

          {/* Navigation Column */}
          <div className="text-center">
            <h4 className="font-semibold text-foreground mb-4">
              {t('footer.navigation', 'Navegación')}
            </h4>
            <nav className="flex flex-col gap-2">
              <Link 
                to="/" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center justify-center md:justify-start gap-2"
              >
                <Home className="h-4 w-4" />
                {t('nav.home', 'Inicio')}
              </Link>
              <Link 
                to="/actividades" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center justify-center md:justify-start gap-2"
              >
                <Search className="h-4 w-4" />
                {t('footer.explore', 'Explorar Actividades')}
              </Link>
              <Link 
                to="/mi-cuenta" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center justify-center md:justify-start gap-2"
              >
                <User className="h-4 w-4" />
                {t('nav.profile', 'Mi Perfil')}
              </Link>
            </nav>
          </div>

          {/* Legal Column */}
          <div className="text-center md:text-right">
            <h4 className="font-semibold text-foreground mb-4">
              {t('footer.legal', 'Legal')}
            </h4>
            <nav className="flex flex-col gap-2">
              <Link 
                to="/privacidad" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.privacy', 'Política de Privacidad')}
              </Link>
              <Link 
                to="/terminos" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.terms', 'Términos de Servicio')}
              </Link>
              <Link 
                to="/cookies" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.cookies', 'Política de Cookies')}
              </Link>
            </nav>
          </div>
        </div>

        {/* Social Links & Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>

            {/* Made with love */}
            <p className="text-xs text-muted-foreground">
              {t('footer.madeWith', 'Hecho con')} ❤️ {t('footer.inSpain', 'en España')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
