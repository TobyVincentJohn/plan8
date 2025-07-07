import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { flight_url, headless = true } = await request.json();

    if (!flight_url) {
      return NextResponse.json({ error: 'Flight URL is required' }, { status: 400 });
    }

    // Use the provided ngrok URL for flight scraping
    const flightScrapingUrl = 'https://web-production-45560.up.railway.app/api/get-flights';
    

    console.log('Fetching flights from:', flightScrapingUrl);
    console.log('Flight URL:', flight_url);

    // Make request to the flight scraping service
    const response = await fetch(flightScrapingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flight_url,
        headless
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Flight scraping API returned ${response.status}:`, errorText);
      return NextResponse.json({ 
        success: false, 
        error: `Flight API error: ${response.status}`,
        flight_options: []
      });
    }

    const flightData = await response.json();
    console.log('Flight data received:', flightData);

    return NextResponse.json({
      success: flightData.success || true,
      flight_options: flightData.flight_options || [],
      total_count: flightData.total_count || 0,
      message: flightData.message || 'Flight data retrieved'
    });

  } catch (error) {
    console.error('Error fetching flights:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch flight data',
        flight_options: []
      },
      { status: 200 } // Return 200 with empty data instead of 500
    );
  }
}
