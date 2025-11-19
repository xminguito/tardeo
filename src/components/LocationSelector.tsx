import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation } from 'lucide-react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
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

const libraries: ("places")[] = ["places"];

export default function LocationSelector() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { location, loading, detectLocation, updateLocation, updateSearchRadius } = useUserLocation();
  const [open, setOpen] = useState(false);
  const [radius, setRadius] = useState(location?.searchRadius ?? 100);
  const [pendingLocation, setPendingLocation] = useState<{
    city: string;
    coordinates: { lat: number; lng: number };
  } | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyB-prz6GAngBEhMnPBdkLBHruNrImmKKjM",
    libraries,
  });

  const handleDetectLocation = async () => {
    await detectLocation();
    toast({
      title: t('location.detected'),
      description: t('location.detectedDesc'),
    });
    setOpen(false);
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const cityName = place.name || place.formatted_address || place.vicinity || '';
        
        setPendingLocation({
          city: cityName,
          coordinates: { lat, lng },
        });
      }
    }
  };

  const handleSaveLocation = () => {
    if (pendingLocation) {
      updateLocation({
        city: pendingLocation.city,
        coordinates: pendingLocation.coordinates,
        searchRadius: radius,
      });
      
      toast({
        title: t('location.updated'),
        description: `${t('location.updatedDesc')} ${pendingLocation.city}`,
      });
      
      setPendingLocation(null);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setPendingLocation(null);
    setRadius(location?.searchRadius ?? 100);
    setOpen(false);
  };

  if (loadError) {
    console.error('Error loading Google Maps:', loadError);
  }

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      if (!newOpen || !pendingLocation) {
        setOpen(newOpen);
      }
    }}>
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
            {isLoaded ? (
              <Autocomplete
                onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                onPlaceChanged={onPlaceChanged}
                options={{
                  types: ['(cities)'],
                }}
              >
                <Input
                  placeholder={t('location.searchPlaceholder')}
                  className="w-full"
                />
              </Autocomplete>
            ) : (
              <Input
                placeholder={t('location.searchPlaceholder')}
                disabled
              />
            )}

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

          {(location || pendingLocation) && (
            <div className="pt-4 border-t space-y-4">
              <p className="text-sm text-muted-foreground">
                {pendingLocation ? t('location.selected') : t('location.current')}: 
                <span className="font-medium text-foreground ml-1">
                  {pendingLocation?.city || location?.city}
                </span>
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('location.searchRadius')}</label>
                  <span className="text-sm text-muted-foreground">{radius} km</span>
                </div>
                <Slider
                  value={[radius]}
                  onValueChange={(value) => setRadius(value[0])}
                  min={5}
                  max={500}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('location.radiusDescription')}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveLocation}
                  disabled={!pendingLocation}
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
