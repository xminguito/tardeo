import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Route, X, Loader2 } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { geocodeLocation } from '@/lib/distance';
import { useToast } from '@/hooks/use-toast';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 41.3851,
  lng: 2.1734,
};

interface GoogleMapViewProps {
  activityCoords: { lat: number; lng: number } | null;
  activityTitle?: string;
  location: string;
  onMapError: () => void;
}

export default function GoogleMapView({
  activityCoords,
  activityTitle,
  location,
  onMapError,
}: GoogleMapViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { location: userLocation } = useUserLocation();

  const [customOrigin, setCustomOrigin] = useState('');
  const [customOriginCoords, setCustomOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showRouteCalculator, setShowRouteCalculator] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const handleUseMyLocation = () => {
    if (userLocation?.coordinates) {
      setCustomOriginCoords(userLocation.coordinates);
      setCustomOrigin(userLocation.city || t('map.myLocation'));
      calculateRoute(userLocation.coordinates);
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
      if (coords) {
        setCustomOriginCoords(coords);
        calculateRoute(coords);
      } else {
        toast({
          title: t('map.locationNotFound'),
          description: t('map.tryAgain'),
          variant: 'destructive',
        });
      }
    } finally {
      setGeocoding(false);
    }
  };

  const calculateRoute = useCallback(async (origin: { lat: number; lng: number }) => {
    if (!activityCoords || !isLoaded) return;

    setCalculatingRoute(true);
    setDirections(null);

    try {
      const directionsService = new google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(activityCoords.lat, activityCoords.lng),
        travelMode: google.maps.TravelMode.DRIVING,
      });
      
      setDirections(result);
      
      if (result.routes[0]?.legs[0]) {
        const leg = result.routes[0].legs[0];
        toast({
          title: t('map.routeCalculated'),
          description: `${leg.distance?.text} - ${leg.duration?.text}`,
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      toast({
        title: t('map.routeError'),
        description: t('map.routeErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setCalculatingRoute(false);
    }
  }, [activityCoords, isLoaded, t, toast]);

  const clearRoute = () => {
    setDirections(null);
    setCustomOrigin('');
    setCustomOriginCoords(null);
    setShowRouteCalculator(false);
  };

  if (loadError) {
    onMapError();
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('map.loadError')}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const mapCenter = activityCoords || defaultCenter;

  return (
    <div className="space-y-3">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={15}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {activityCoords && !directions && (
          <Marker
            position={activityCoords}
            title={activityTitle || location}
          />
        )}
        
        {customOriginCoords && !directions && (
          <Marker
            position={customOriginCoords}
            title={t('map.origin')}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            }}
          />
        )}
        
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: '#c9553d',
                strokeWeight: 4,
              },
            }}
          />
        )}
      </GoogleMap>

      {/* Route Calculator for map mode */}
      {!showRouteCalculator ? (
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => setShowRouteCalculator(true)}
        >
          <Route className="h-4 w-4" />
          {t('map.calculateRoute')}
        </Button>
      ) : (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{t('map.calculateRoute')}</h4>
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
              disabled={!customOrigin.trim() || geocoding || calculatingRoute}
            >
              {geocoding || calculatingRoute ? (
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
            disabled={!userLocation?.coordinates || calculatingRoute}
          >
            <Navigation className="h-4 w-4" />
            {t('map.useMyLocation')}
          </Button>

          {directions?.routes[0]?.legs[0] && (
            <div className="text-sm text-center p-3 bg-primary/10 rounded-lg">
              <p className="font-semibold text-primary">
                {directions.routes[0].legs[0].distance?.text}
              </p>
              <p className="text-muted-foreground">
                {directions.routes[0].legs[0].duration?.text} {t('map.byCar')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

