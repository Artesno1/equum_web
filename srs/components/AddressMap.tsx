import React, { useState, useEffect, useCallback } from 'react';
import { Map, Marker, APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';

interface AddressMapProps {
  address: string;
  setAddress: (address: string) => void;
  placeholder: string;
  error?: string;
}

const AddressMap: React.FC<AddressMapProps> = ({ address, setAddress, placeholder, error }) => {
  const [mapApiLoaded, setMapApiLoaded] = useState(false);
  const [position, setPosition] = useState<{ lat: number, lng: number }>({ 
    lat: 55.7558, 
    lng: 37.6173 
  }); // Default to Moscow
  
  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      const clickedLatLng = { 
        lat: e.detail.latLng.lat, 
        lng: e.detail.latLng.lng 
      };
      setPosition(clickedLatLng);
      
      // Reverse geocode to get the address
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: clickedLatLng }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            setAddress(results[0].formatted_address);
          }
        });
      }
    }
  };
  
  const handlePlaceSearch = useCallback(async () => {
    if (!address || !window.google || !window.google.maps) return;
    
    const geocoder = new window.google.maps.Geocoder();
    
    try {
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results) {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });
      
      if (results[0]?.geometry?.location) {
        const newPosition = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        setPosition(newPosition);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  }, [address]);
  
  // Update map when address changes from external sources
  useEffect(() => {
    if (window.google && window.google.maps) {
      handlePlaceSearch();
    }
  }, [address, handlePlaceSearch]);
  
  // Mark API as loaded
  useEffect(() => {
    if (window.google?.maps) {
      setMapApiLoaded(true);
    }
  }, []);
  
  return (
    <div className="mb-4">
      <div className="flex flex-col">
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={handlePlaceSearch}
            placeholder={placeholder}
            className={`uber-input ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <div className="h-64 w-full mt-2 rounded-lg overflow-hidden border-2 border-champagne/20">
          <Map
            defaultCenter={position}
            defaultZoom={15}
            mapId="equum-taxi-map"
            onClick={handleMapClick}
            center={position}
          >
            <Marker position={position} />
          </Map>
        </div>
      </div>
    </div>
  );
};

export default AddressMap; 
