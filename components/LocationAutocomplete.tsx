'use client';

import { useState, useRef } from 'react';

interface Prediction {
  description: string;
  place_id: string;
  types?: string[];
  structured_formatting?: { main_text?: string };
}

export default function LocationAutocomplete({
  onSelect,
  placeholder = 'Enter a location',
  className = ''
}: {
  onSelect: (place: Prediction) => void;
  placeholder?: string;
  className?: string;
}) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced fetch for autocomplete
  const fetchSuggestions = async (value: string) => {
    if (!value) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch('/api/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value })
      });
      const data = await res.json();
      setSuggestions(data.predictions || []);
    } catch (err) {
      setSuggestions([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setShowDropdown(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 500);
  };

  const handleSelect = (prediction: Prediction) => {
    let displayValue = prediction.description;
    const allowedTypes = ['locality', 'administrative_area_level_1', 'country'];
    if (
      prediction.types?.some((t) => allowedTypes.includes(t)) &&
      prediction.structured_formatting?.main_text
    ) {
      displayValue = prediction.structured_formatting.main_text;
    }
    setInput(displayValue);
    setShowDropdown(false);
    setSuggestions([]);
    onSelect(prediction);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        onFocus={() => input && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
        placeholder={placeholder}
        className={`w-full border p-2 rounded shadow ${className}`}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded shadow z-10 mt-1 max-h-60 overflow-auto">
          {suggestions.map((prediction) => (
            <li
              key={prediction.place_id}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onMouseDown={() => handleSelect(prediction)}
            >
              {prediction.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 