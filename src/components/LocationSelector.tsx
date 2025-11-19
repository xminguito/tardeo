import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useToast } from '@/hooks/use-toast';

export default function LocationSelector() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { location, loading, detectLocation, updateLocation, updateSearchRadius } = useUserLocation();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [radius, setRadius] = useState(location?.searchRadius || 10);

  const handleDetectLocation = async () => {
    await detectLocation();
    toast({
      title: t('location.detected'),
      description: t('location.detectedDesc'),
    });
  };

  const handleSearchLocation = async () => {
    if (!searchInput.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=1&accept-language=es`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        updateLocation({
          city: result.name || searchInput,
          coordinates: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          },
        });
        setOpen(false);
        setSearchInput('');
        toast({
          title: t('location.updated'),
          description: `${t('location.updatedDesc')} ${result.name || searchInput}`,
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('location.notFound'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching location:', error);
      toast({
        title: t('common.error'),
        description: t('location.searchError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="secondary" 
          className="gap-2 hover:bg-secondary/80 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          <span className="hidden md:inline">
            {loading ? t('location.detecting') : location?.city || t('location.select')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t('location.title')}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t('location.description')}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t('location.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
              />
              <Button 
                size="icon" 
                onClick={handleSearchLocation}
                disabled={!searchInput.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDetectLocation}
              disabled={loading}
            >
              <Navigation className="h-4 w-4" />
              {loading ? t('location.detecting') : t('location.detectAuto')}
            </Button>
          </div>

          {location && (
            <div className="pt-4 border-t space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('location.current')}: <span className="font-medium text-foreground">{location.city}</span>
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('location.searchRadius')}</label>
                  <span className="text-sm text-muted-foreground">{radius} km</span>
                </div>
                <Slider
                  value={[radius]}
                  onValueChange={(value) => {
                    setRadius(value[0]);
                    updateSearchRadius(value[0]);
                  }}
                  min={5}
                  max={500}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('location.radiusDescription')}
                </p>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
