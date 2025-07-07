import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Client, PlaceInputType } from '@googlemaps/google-maps-services-js';

const client = new Client();

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getPlaceCoordinates(placeName: string, city: string) {
  try {
    // Try with placeName + city first
    let searchQuery = `${placeName}, ${city}`;
    let response = await client.findPlaceFromText({
      params: {
        input: searchQuery,
        inputtype: PlaceInputType.textQuery,
        fields: ['geometry'],
        key: process.env.GOOGLE_API_KEY!,
      },
    });

    if (response.data.candidates?.[0]?.geometry?.location) {
      const { lat, lng } = response.data.candidates[0].geometry.location;
      return { lat, lng };
    }

    // Fallback: try with just the place name
    response = await client.findPlaceFromText({
      params: {
        input: placeName,
        inputtype: PlaceInputType.textQuery,
        fields: ['geometry'],
        key: process.env.GOOGLE_API_KEY!,
      },
    });

    if (response.data.candidates?.[0]?.geometry?.location) {
      const { lat, lng } = response.data.candidates[0].geometry.location;
      return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error('Error getting place coordinates:', error);
    return null;
  }
}
