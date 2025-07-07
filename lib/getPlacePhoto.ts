import axios from "axios";

const BASE_URL = 'https://places.googleapis.com/v1/places:searchText';
const API_KEY = process.env.GOOGLE_API_KEY!;

const config = {
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'places.photos,places.displayName,places.id'
  }
};

export async function getGooglePlacePhotoUrl(query: string): Promise<string | null> {
  try {
    const { data } = await axios.post(BASE_URL, { textQuery: query }, config);
    const place = data.places?.[0];
    const photoRef = place?.photos?.[0]?.name;
    if (photoRef) {
      return `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=1000&maxWidthPx=1900&key=${API_KEY}`;
    }
  } catch (e) {
    console.error('Google Place photo error:', e);
  }
  return null;
} 