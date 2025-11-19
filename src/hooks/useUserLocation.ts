import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface LocationData {
  city: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  searchRadius?: number; // in kilometers
}

const LOCATION_STORAGE_KEY = 'user_location';

interface UserLocationContextValue {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  detectLocation: () => Promise<void>;
  updateLocation: (newLocation: LocationData) => void;
  updateSearchRadius: (radius: number) => void;
  clearLocation: () => void;
}

const UserLocationContext = createContext<UserLocationContextValue | undefined>(undefined);

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LOCATION_STORAGE_KEY) : null;
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect location by IP on first visit (no browser popup)
  useEffect(() => {
    if (!location) {
      detectLocationByIP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistLocation = (loc: LocationData | null) => {
    setLocation(loc);
    if (loc) {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    } else {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    }
  };

  const detectLocationByIP = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (!data || !data.city) {
        throw new Error('No city from IP');
      }

      const cityName = data.city;

      const locationData: LocationData = {
        city: cityName,
        coordinates: data.latitude && data.longitude
          ? { lat: data.latitude, lng: data.longitude }
          : undefined,
        searchRadius: location?.searchRadius || 10, // Keep existing or default 10km
      };

      persistLocation(locationData);
    } catch (err) {
      console.error('Error detecting location by IP:', err);
      // Silent for user
    } finally {
      setLoading(false);
    }
  };

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
        searchRadius: location?.searchRadius || 10, // Keep existing or default 10km
      };

      persistLocation(locationData);
    } catch (err) {
      console.error('Error detecting location:', err);
      setError('No se pudo detectar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = (newLocation: LocationData) => {
    persistLocation(newLocation);
  };

  const updateSearchRadius = (radius: number) => {
    if (location) {
      const updatedLocation = { ...location, searchRadius: radius };
      persistLocation(updatedLocation);
    }
  };

  const clearLocation = () => {
    persistLocation(null);
  };

  const value: UserLocationContextValue = {
    location,
    loading,
    error,
    detectLocation,
    updateLocation,
    updateSearchRadius,
    clearLocation,
  };

  return React.createElement(
    UserLocationContext.Provider,
    { value },
    children
  );
}

export function useUserLocation(): UserLocationContextValue {
  const context = useContext(UserLocationContext);
  if (!context) {
    throw new Error('useUserLocation must be used within a UserLocationProvider');
  }
  return context;
}
