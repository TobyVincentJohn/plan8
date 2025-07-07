import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client();

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input) {
      return NextResponse.json({ predictions: [] });
    }

    const response = await client.placeAutocomplete({
      params: {
        input,
        key: process.env.GOOGLE_API_KEY!,
        types: '(regions)' as any,
      },
    });

    // Only keep predictions that are cities, states, or countries
    const allowedTypes = [
      'locality', // city
      'administrative_area_level_1', // state/province
      'country', // country
    ];
    const filtered = (response.data.predictions || []).filter((p: any) =>
      p.types?.some((t: string) => allowedTypes.includes(t))
    );

    return NextResponse.json({ predictions: filtered });
  } catch (error) {
    console.error('Google Places Autocomplete error:', error);
    return NextResponse.json({ predictions: [], error: 'Autocomplete failed' }, { status: 500 });
  }
} 