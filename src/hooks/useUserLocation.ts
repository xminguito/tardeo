import { useState, useEffect } from 'react';

interface LocationData {
  city: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const LOCATION_STORAGE_KEY = 'user_location';

export function useUserLocation() {
  const [location, setLocation] = useState<LocationData | null>(() => {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding to get city name
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`
      );
      const data = await response.json();

      const city = data.address?.city || 
                   data.address?.town || 
                   data.address?.village || 
                   data.address?.municipality || 
                   'Ubicación actual';

      const locationData: LocationData = {
        city,
        coordinates: { lat: latitude, lng: longitude },
      };

      updateLocation(locationData);
    } catch (err) {
      console.error('Error detecting location:', err);
      setError('No se pudo detectar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = (newLocation: LocationData) => {
    setLocation(newLocation);
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
  };

  const clearLocation = () => {
    setLocation(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  };

  return {
    location,
    loading,
    error,
    detectLocation,
    updateLocation,
    clearLocation,
  };
}
