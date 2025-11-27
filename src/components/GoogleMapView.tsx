import { useTranslation } from 'react-i18next';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { MapPin, Loader2 } from 'lucide-react';

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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

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
      {activityCoords && (
        <Marker
          position={activityCoords}
          title={activityTitle || location}
        />
      )}
    </GoogleMap>
  );
}
