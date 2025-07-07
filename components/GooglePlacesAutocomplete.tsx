import React, { useEffect, useRef } from 'react';

interface PlaceAutocompleteElement extends HTMLInputElement {
  getPlace: () => google.maps.places.PlaceResult;
}

interface GooglePlacesAutocompleteProps {
  onSelect: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onSelect,
  placeholder = 'Enter a location',
  className = '',
}) => {
  const inputRef = useRef<PlaceAutocompleteElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    // Initialize the Places Autocomplete service
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['(regions)'],
      fields: ['address_components', 'geometry', 'name', 'formatted_address'],
    });

    // Add listener for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      if (!autocompleteRef.current) return;
      const place = autocompleteRef.current.getPlace();
      onSelect(place);
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className={`w-full border p-2 rounded shadow ${className}`}
      autoComplete="off"
    />
  );
};

export default GooglePlacesAutocomplete; 