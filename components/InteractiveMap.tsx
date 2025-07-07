import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { MapPin } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  day?: string;
  type?: string;
  visitTime?: string;
  duration?: string;
  walkTimeFromPrevious?: string;
}

interface InteractiveMapProps {
  locations: Location[];
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

const InteractiveMap = forwardRef(function InteractiveMap(
  {
    locations,
    center = { lat: 48.8566, lng: 2.3522 },
    zoom = 12,
    className = ''
  }: InteractiveMapProps,
  ref
) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    centerMapAt: (lat: number, lng: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng });
        mapInstanceRef.current.setZoom(15);
      }
    }
  }));

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
    });
    loader.load().then(() => {
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
    }
  }, [isLoaded, center, zoom]);

  useEffect(() => {
    console.log('isLoaded:', isLoaded, 'mapInstanceRef.current:', !!mapInstanceRef.current, 'locations:', locations);
    if (mapInstanceRef.current && locations.length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers
      locations.forEach((location, index) => {
        console.log('Creating marker at', location.lat, location.lng, location.name);
        const marker = new window.google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: mapInstanceRef.current,
          title: location.name,
          label: {
            text: (index + 1).toString(),
            color: '#1E40AF',
            fontWeight: 'bold'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: '#f6f5f5',
            fillOpacity: 1,
            strokeColor: '#1E40AF',
            strokeWeight: 2
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-4 max-w-xs">
              <div class="flex items-center space-x-2 mb-2">
                <span class="text-lg">${getTypeIcon(location.type || 'attraction')}</span>
                <h3 class="font-semibold text-gray-900 text-sm">${location.name}</h3>
              </div>
              ${location.visitTime ? `<p class="text-xs text-blue-600 mb-1">📅 Visit at ${location.visitTime}</p>` : ''}
              ${location.duration ? `<p class="text-xs text-green-600 mb-1">⏱️ Duration: ${location.duration}</p>` : ''}
              ${location.walkTimeFromPrevious ? `<p class="text-xs text-orange-600">🚶 ${location.walkTimeFromPrevious} from previous</p>` : ''}
            </div>
          `
        });

        marker.addListener('mouseover', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        marker.addListener('mouseout', () => {
          infoWindow.close();
        });

        markersRef.current.push(marker);
      });

      // Commented out to allow manual centering to persist
      // if (locations.length > 1) {
      //   const bounds = new window.google.maps.LatLngBounds();
      //   locations.forEach(location => {
      //     bounds.extend({ lat: location.lat, lng: location.lng });
      //   });
      //   mapInstanceRef.current.fitBounds(bounds);
      // } else if (locations.length === 1) {
      //   mapInstanceRef.current.setCenter({ lat: locations[0].lat, lng: locations[0].lng });
      //   mapInstanceRef.current.setZoom(15);
      // }
    }
  }, [locations, isLoaded]);

  if (!isLoaded) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {locations.length === 0 && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">Interactive Map</h3>
            <p className="text-gray-500 text-sm">Locations will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
});

// Helper function to get type icon (same as in travel-plan page)
function getTypeIcon(type: string): string {
  switch (type) {
    case 'monument': return '🏛️';
    case 'museum': return '🏛️';
    case 'park': return '🌳';
    case 'food': return '🍽️';
    case 'shopping': return '🛍️';
    case 'photo_spot': return '📸';
    case 'historical': return '🏰';
    case 'entertainment': return '🎭';
    case 'cultural': return '🎨';
    case 'nature': return '🌿';
    default: return '📍';
  }
}

export default InteractiveMap;