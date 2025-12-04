import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Route, X, Loader2, Calculator, Map } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { calculateDistance, geocodeLocation } from '@/lib/distance';
import { useToast } from '@/hooks/use-toast';

// Lazy load the map component to avoid loading Google Maps when not needed
const GoogleMapView = lazy(() => import('./GoogleMapView'));

interface ActivityMapProps {
  location: string;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  activityTitle?: string;
}

export default function ActivityMap({ 
  location, 
  city,
  province,
  country,
  latitude, 
  longitude,
  activityTitle 
}: ActivityMapProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { location: userLocation } = useUserLocation();
  
  const [activityCoords, setActivityCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [showDistanceCalculator, setShowDistanceCalculator] = useState(false);
  const [customOrigin, setCustomOrigin] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [calculatedDistanceFromInput, setCalculatedDistanceFromInput] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true); // Map open by default

  // Check if Google Maps API key is configured
  const hasGoogleMapsKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  // Geocode activity location if no coords provided
  useEffect(() => {
    if (!activityCoords && location) {
      // Build full address with all available location parts
      const countryName = country || 'Spain';
      const locationParts = [location, city, province, countryName].filter(Boolean);
      const fullAddress = locationParts.join(', ');
      
      geocodeLocation(fullAddress).then((coords) => {
        if (coords) {
          setActivityCoords(coords);
        } else if (city) {
          // Fallback to city + province + country
          const fallbackParts = [city, province, countryName].filter(Boolean);
          geocodeLocation(fallbackParts.join(', ')).then((cityCoords) => {
            if (cityCoords) {
              setActivityCoords(cityCoords);
            }
          });
        }
      });
    }
  }, [location, city, province, country, activityCoords]);

  // Calculate distance from user location
  useEffect(() => {
    if (userLocation?.coordinates && activityCoords) {
      const dist = calculateDistance(
        userLocation.coordinates.lat,
        userLocation.coordinates.lng,
        activityCoords.lat,
        activityCoords.lng
      );
      setDistance(dist);
    }
  }, [userLocation, activityCoords]);

  const handleUseMyLocation = () => {
    if (userLocation?.coordinates) {
      setCustomOrigin(userLocation.city || t('map.myLocation'));
      
      if (activityCoords) {
        const dist = calculateDistance(
          userLocation.coordinates.lat,
          userLocation.coordinates.lng,
          activityCoords.lat,
          activityCoords.lng
        );
        setCalculatedDistanceFromInput(dist);
        toast({
          title: t('map.distanceCalculated'),
          description: `${dist.toFixed(1)} km (${t('map.straightLine')})`,
        });
      }
    } else {
      toast({
        title: t('map.noLocation'),
        description: t('map.enableLocation'),
        variant: 'destructive',
      });
    }
  };

  const handleSearchOrigin = async () => {
    if (!customOrigin.trim()) return;
    
    setGeocoding(true);
    try {
      const coords = await geocodeLocation(customOrigin);
      if (coords && activityCoords) {
        const dist = calculateDistance(
          coords.lat,
          coords.lng,
          activityCoords.lat,
          activityCoords.lng
        );
        setCalculatedDistanceFromInput(dist);
        toast({
          title: t('map.distanceCalculated'),
          description: `${dist.toFixed(1)} km (${t('map.straightLine')})`,
        });
      } else if (!coords) {
        toast({
          title: t('map.locationNotFound'),
          description: t('map.tryAgain'),
          variant: 'destructive',
        });
      } else if (!activityCoords) {
        toast({
          title: t('map.locationNotFound'),
          description: t('map.activityLocationNotFound'),
          variant: 'destructive',
        });
      }
    } finally {
      setGeocoding(false);
    }
  };

  const clearRoute = () => {
    setCustomOrigin('');
    setShowDistanceCalculator(false);
    setCalculatedDistanceFromInput(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('map.location')}
          </CardTitle>
          {distance !== null && (
            <span className="text-sm text-muted-foreground">
              {t('map.distanceFromYou', { distance: distance.toFixed(1) })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location text */}
        <div className="text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            {location}
          </p>
          {(city || province) && (
            <p className="ml-6 text-xs">
              {[city, province].filter(Boolean).join(', ')}
              {country && ` · ${country}`}
            </p>
          )}
        </div>

        {/* Show Map button if API key exists and map not yet shown */}
        {hasGoogleMapsKey && !showMap && (
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => setShowMap(true)}
          >
            <Map className="h-4 w-4" />
            {t('map.showMap')}
          </Button>
        )}

        {/* Map - only loaded when explicitly requested */}
        {showMap && hasGoogleMapsKey && (
          <Suspense fallback={
            <div className="h-[300px] flex items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <GoogleMapView
              activityCoords={activityCoords}
              activityTitle={activityTitle}
              location={location}
              onMapError={() => setShowMap(false)}
            />
          </Suspense>
        )}

        {/* Distance Calculator Toggle */}
        {!showDistanceCalculator ? (
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => setShowDistanceCalculator(true)}
          >
            <Calculator className="h-4 w-4" />
            {t('map.calculateDistance')}
          </Button>
        ) : (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{t('map.calculateDistanceTitle')}</h4>
              <Button variant="ghost" size="icon" onClick={clearRoute}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder={t('map.enterOrigin')}
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchOrigin()}
              />
              <Button 
                onClick={handleSearchOrigin}
                disabled={!customOrigin.trim() || geocoding}
              >
                {geocoding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Route className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <Button 
              variant="secondary" 
              className="w-full gap-2"
              onClick={handleUseMyLocation}
              disabled={!userLocation?.coordinates}
            >
              <Navigation className="h-4 w-4" />
              {t('map.useMyLocation')}
            </Button>

            {calculatedDistanceFromInput !== null && (
              <div className="text-sm text-center p-3 bg-primary/10 rounded-lg">
                <p className="font-semibold text-primary">
                  {calculatedDistanceFromInput.toFixed(1)} km
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('map.straightLineDistance')}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
