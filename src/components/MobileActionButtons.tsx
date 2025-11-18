import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Heart, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface MobileActionButtonsProps {
  favoritesCount?: number;
  notificationsCount?: number;
}

const MobileActionButtons = ({ 
  favoritesCount = 0, 
  notificationsCount = 0 
}: MobileActionButtonsProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-6 left-4 z-40 flex flex-col gap-3">
      {/* Botón de Calendario */}
      <Button
        onClick={() => navigate("/actividades")}
        size="icon"
        variant={isActive("/actividades") ? "default" : "outline"}
        className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform duration-200"
        aria-label={t('mobileActions.calendar')}
      >
        <Calendar className="h-6 w-6" />
      </Button>

      {/* Botón de Favoritos */}
      <div className="relative">
        <Button
          onClick={() => navigate("/favoritos")}
          size="icon"
          variant={isActive("/favoritos") ? "default" : "outline"}
          className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform duration-200"
          aria-label={t('mobileActions.favorites')}
        >
          <Heart className="h-6 w-6" />
        </Button>
        {favoritesCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            variant="destructive"
          >
            {favoritesCount > 9 ? '9+' : favoritesCount}
          </Badge>
        )}
      </div>

      {/* Botón de Notificaciones */}
      <div className="relative">
        <Button
          onClick={() => navigate("/notificaciones")}
          size="icon"
          variant={isActive("/notificaciones") ? "default" : "outline"}
          className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform duration-200"
          aria-label={t('mobileActions.notifications')}
        >
          <Bell className="h-6 w-6" />
        </Button>
        {notificationsCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            variant="destructive"
          >
            {notificationsCount > 9 ? '9+' : notificationsCount}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default MobileActionButtons;
