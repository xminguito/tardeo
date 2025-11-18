import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Heart, Settings, LogIn } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import MobileNav from '@/components/MobileNav';

interface HeaderProps {
  user: any;
  isUserAdmin?: boolean;
  favoritesCount?: number;
}

export default function Header({ user, isUserAdmin = false, favoritesCount = 0 }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground py-4 md:py-8 px-4 shadow-xl">
      <div className="container mx-auto max-w-full">
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <MobileNav 
              user={user} 
              isUserAdmin={isUserAdmin} 
              favoritesCount={favoritesCount}
            />
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate('/')}>
              <h1 className="text-2xl md:text-5xl font-bold mb-1 md:mb-2 truncate">{t('home.title')}</h1>
              <p className="text-sm md:text-xl opacity-90 truncate">{t('home.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-1 md:gap-3 items-center flex-shrink-0">
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            <div className="hidden md:flex gap-3 items-center flex-shrink-0">
              {user ? (
                <>
                  {isUserAdmin && (
                    <Button variant="secondary" onClick={() => navigate("/admin")}>
                      <Settings className="mr-2 h-5 w-5" />
                      Admin
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => navigate("/mi-cuenta")}>
                    <User className="mr-2 h-5 w-5" />
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
                </>
              ) : (
                <Button variant="secondary" onClick={() => navigate("/auth")}>
                  <LogIn className="mr-2 h-5 w-5" />
                  {t('home.login')}
                </Button>
              )}
            </div>
            {user && <NotificationsDropdown userId={user.id} />}
          </div>
        </div>
      </div>
    </header>
  );
}
