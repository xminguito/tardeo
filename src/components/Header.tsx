import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import tardeoLogo from '@/assets/tardeo-logo.jpg';
import { Badge } from '@/components/ui/badge';
import { User, Heart, Settings, LogIn, Users, MessageCircle, Search, Command } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import LocationSelector from '@/components/LocationSelector';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import MobileNav from '@/components/MobileNav';
import GlobalSearch from '@/components/GlobalSearch';

interface HeaderProps {
  user: any;
  isUserAdmin?: boolean;
  favoritesCount?: number;
}

export default function Header({ user, isUserAdmin = false, favoritesCount = 0 }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground py-4 md:py-8 px-4 shadow-xl">
      <div className="container mx-auto px-0 max-w-full">
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <MobileNav 
              user={user} 
              isUserAdmin={isUserAdmin} 
              favoritesCount={favoritesCount}
            />
            <div className="min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
              <img src={tardeoLogo} alt="Tardeo" className="h-10 md:h-16 w-auto" />
              <p className="hidden md:inline-block text-sm pl-3.5 opacity-90 truncate">{t('home.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-1 md:gap-3 items-center flex-shrink-0 pr-4">
            {/* Search Button - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Search className="h-5 w-5" />
            </Button>

            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            <div className="hidden md:block">
              <LocationSelector />
            </div>
            <div className="hidden md:flex gap-3 items-center flex-shrink-0">
              {/* Search Button - Desktop */}
              <Button
                variant="secondary"
                onClick={() => setSearchOpen(true)}
                className="gap-1 min-w-36 justify-start text-muted-foreground hover:text-foreground"
              >
                <Search className="h-4 w-4 text-white" />
                <span className="flex-1 text-left text-white">{t('globalSearch.button')}</span>
              </Button>

              {user ? (
                <>
                  {isUserAdmin && (
                    <Button variant="secondary" onClick={() => navigate("/admin")}>
                      <Settings className="mr-1 h-5 w-5" />
                      Admin
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => navigate("/mi-cuenta")}>
                    <User className="mr-1 h-5 w-5" />
                    {t('home.profile')}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate("/favoritos")}
                    className="relative"
                  >
                    <Heart className="h-5 w-5 fill-current" />
                    {favoritesCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground min-w-[20px] h-5 flex items-center justify-center">
                        {favoritesCount}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate("/explorar-perfiles")}
                  >
                    <Users className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate("/chat")}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => navigate("/auth")}>
                  <LogIn className="mr-1 h-5 w-5" />
                  {t('home.login')}
                </Button>
              )}
            </div>
            {user && <NotificationsDropdown userId={user.id} />}
          </div>
        </div>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
