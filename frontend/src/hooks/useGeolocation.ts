import { useState } from "react";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  coordinates: Coordinates | null;
  gpsLoading: boolean;
  detectGps: (onLocationDetected?: (coords: Coordinates, label: string) => void) => void;
  setCoordinates: React.Dispatch<React.SetStateAction<Coordinates | null>>;
}

export const useGeolocation = (): GeolocationState => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const detectGps = (onLocationDetected?: (coords: Coordinates, label: string) => void) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoordinates(coords);
        setGpsLoading(false);
        const label = `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)} (GPS Detected)`;
        if (onLocationDetected) {
          onLocationDetected(coords, label);
        }
      },
      (err) => {
        console.warn("GPS error, applying estimated fallback:", err);
        const fallbackCoords = { lat: 24.9284, lng: 67.0982 };
        setCoordinates(fallbackCoords);
        setGpsLoading(false);
        const fallbackLabel = "Gulshan-e-Iqbal, District East, Karachi (Estimated)";
        if (onLocationDetected) {
          onLocationDetected(fallbackCoords, fallbackLabel);
        }
      },
      { timeout: 8000 }
    );
  };

  return {
    coordinates,
    gpsLoading,
    detectGps,
    setCoordinates,
  };
};
