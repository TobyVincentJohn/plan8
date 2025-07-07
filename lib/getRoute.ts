import { Client, TravelMode } from '@googlemaps/google-maps-services-js';

const client = new Client();

export async function getOptimalRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  try {
    const response = await client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: process.env.GOOGLE_API_KEY!,
        alternatives: false,
        mode: TravelMode.transit, // Try transit first
      },
    });

    // If no transit route, try driving, walking, bicycling
    let route = response.data.routes[0];
    let travelMode = TravelMode.transit;
    if (!route) {
      for (const mode of [TravelMode.driving, TravelMode.walking, TravelMode.bicycling]) {
        const altRes = await client.directions({
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            key: process.env.GOOGLE_API_KEY!,
            alternatives: false,
            mode,
          },
        });
        if (altRes.data.routes[0]) {
          route = altRes.data.routes[0];
          travelMode = mode;
          break;
        }
      }
    }

    if (!route) return null;

    const leg = route.legs[0];
    return {
      travelMode,
      duration: leg.duration.text,
      distance: leg.distance.text,
      summary: route.summary,
      steps: leg.steps.map((step: any) => ({
        travelMode: step.travel_mode,
        instruction: step.html_instructions,
        duration: step.duration.text,
        distance: step.distance.text,
      })),
    };
  } catch (error) {
    console.error('Error getting optimal route:', error);
    return null;
  }
}

export async function getAllTravelModes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const modes: TravelMode[] = [TravelMode.walking, TravelMode.bicycling, TravelMode.driving, TravelMode.transit];
  const results: Record<string, { duration: string; distance: string } | null> = {};

  for (const mode of modes) {
    try {
      const response = await client.directions({
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          key: process.env.GOOGLE_API_KEY!,
          alternatives: false,
          mode,
        },
      });
      const route = response.data.routes[0];
      if (route) {
        const leg = route.legs[0];
        results[mode] = {
          duration: leg.duration.text,
          distance: leg.distance.text,
        };
      } else {
        results[mode] = null;
      }
    } catch {
      results[mode] = null;
    }
  }
  return results;
} 