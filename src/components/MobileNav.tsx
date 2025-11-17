import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, User, Heart, Calendar, Settings, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import LanguageSelector from "@/components/LanguageSelector";

interface MobileNavProps {
  user: any;
  isUserAdmin: boolean;
  favoritesCount: number;
}

export default function MobileNav({ user, isUserAdmin, favoritesCount }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>{t('home.title')}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 px-2">
          <LanguageSelector inMobileMenu={true} />
        </div>
        <Separator className="my-4" />
        <div className="flex flex-col gap-4">
          {user ? (
            <>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavigate("/mi-cuenta")}
              >
                <User className="mr-2 h-5 w-5" />
                {t('home.profile')}
              </Button>
              
              <Button
                variant="ghost"
                className="justify-start relative"
                onClick={() => handleNavigate("/favoritos")}
              >
                <Heart className="mr-2 h-5 w-5" />
                {t('favorites.title')}
                {favoritesCount > 0 && (
                  <Badge className="ml-auto bg-accent text-accent-foreground">
                    {favoritesCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavigate("/actividades")}
              >
                <Calendar className="mr-2 h-5 w-5" />
                {t('home.featuredActivities')}
              </Button>

              {isUserAdmin && (
                <>
                  <Separator />
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavigate("/admin")}
                  >
                    <Settings className="mr-2 h-5 w-5" />
                    Admin
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => handleNavigate("/auth")}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {t('home.login')}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
