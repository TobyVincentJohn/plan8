import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface GroupMember {
  user_id: string;
  schedule_and_logistics?: string;
  flight_preference?: string;
  profiles: { 
    first_name: string; 
    last_name: string; 
  }[];
}

interface BookingUrlParams {
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
  adults: number;
  cabinClass: string;
}

function constructBookingUrl(params: BookingUrlParams): string {
  console.log('🔗 Constructing booking URL with params:', params);
  
  const baseUrl = 'https://flights.booking.com/flights';
  const route = `${params.from}.AIRPORT-${params.to}.AIRPORT/`;
  
  const searchParams = new URLSearchParams({
    type: 'ROUNDTRIP',
    adults: params.adults.toString(),
    cabinClass: params.cabinClass,
    children: '',
    from: `${params.from}.AIRPORT`,
    to: `${params.to}.AIRPORT`,
    depart: params.departDate,
    return: params.returnDate,
    sort: 'BEST',
    travelPurpose: 'leisure',
    ca_source: 'flights_index_sb'
  });

  const finalUrl = `${baseUrl}/${route}?${searchParams.toString()}`;
  console.log('🔗 Generated booking URL:', finalUrl);
  
  return finalUrl;
}

export async function POST(request: NextRequest) {
  console.log('🚀 Starting determine-travel-dates API call');
  
  try {
    console.log('📥 Parsing request body...');
    const { groupId } = await request.json();
    console.log('📥 Request body parsed successfully. GroupId:', groupId);

    if (!groupId) {
      console.error('❌ No group ID provided');
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    console.log('🔍 Fetching group details from database...');
    // Get group details
    const { data: groupData, error: groupError } = await supabase
      .from('travel_groups')
      .select('destination, destination_display, host_id')
      .eq('group_id', groupId)
      .single();

    if (groupError) {
      console.error('❌ Error fetching group data:', groupError);
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!groupData) {
      console.error('❌ No group data found for groupId:', groupId);
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    console.log('✅ Group data fetched successfully:', {
      destination: groupData.destination,
      destination_display: groupData.destination_display,
      host_id: groupData.host_id
    });

    console.log('👥 Fetching group members data...');
    // Get all group members with their schedules and flight preferences
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select(`
        user_id,
        schedule_and_logistics,
        flight_preference,
        profiles!group_members_user_id_fkey(first_name, last_name)
      `)
      .eq('group_id', groupId);

    if (membersError) {
      console.error('❌ Error fetching members data:', membersError);
      return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
    }

    if (!membersData) {
      console.error('❌ No members data found for groupId:', groupId);
      return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
    }

    console.log('✅ Members data fetched successfully. Member count:', membersData.length);
    console.log('👥 Members data:', membersData.map(m => ({
      user_id: m.user_id,
      name: `${m.profiles?.[0]?.first_name} ${m.profiles?.[0]?.last_name}`,
      has_schedule: !!m.schedule_and_logistics,
      has_flight_pref: !!m.flight_preference
    })));

    console.log('🏠 Fetching host profile for fallback location...');
    // Get host profile for fallback departure location
    const { data: hostProfile, error: hostError } = await supabase
      .from('profiles')
      .select('state, country')
      .eq('user_id', groupData.host_id)
      .single();

    if (hostError) {
      console.warn('⚠️ Warning: Could not fetch host profile:', hostError);
    } else {
      console.log('✅ Host profile fetched:', hostProfile);
    }

    console.log('✈️ Determining flight class from preferences...');
    // Determine flight class based on preferences
    const flightPreferences = membersData
      .map(member => member.flight_preference)
      .filter(pref => pref);

    console.log('✈️ Flight preferences found:', flightPreferences);

    let flightClass = 'ECONOMY'; // Default
    if (flightPreferences.includes('ECONOMY')) {
      flightClass = 'ECONOMY';
    } else if (flightPreferences.includes('BUSINESS')) {
      flightClass = 'BUSINESS';
    } else if (flightPreferences.includes('FIRST')) {
      flightClass = 'FIRST';
    }

    console.log('✈️ Selected flight class:', flightClass);

    console.log('📋 Formatting member data for LLM...');
    // Format member data for LLM
    const memberSchedules = membersData.map((member: any) => ({
      name: `${member.profiles?.[0]?.first_name || 'Unknown'} ${member.profiles?.[0]?.last_name || 'User'}`,
      schedule: member.schedule_and_logistics || 'No schedule information provided',
      flightPreference: member.flight_preference || 'Not specified'
    }));

    console.log('📋 Formatted member schedules:', memberSchedules);

    // Handle single person case
    const isSinglePerson = memberSchedules.length === 1;
    const groupDescription = isSinglePerson 
      ? `solo traveler ${memberSchedules[0].name}` 
      : `group of ${memberSchedules.length} members`;
    
    const scheduleAnalysis = isSinglePerson
      ? `Since this is a solo trip, use the traveler's schedule preferences to determine optimal dates.`
      : `Analyze all member schedules to find common available dates that work for everyone.`;

    console.log('🤖 Preparing LLM prompt...');
    // Create prompt for LLM to determine travel dates
    const prompt = `
You are a travel planning assistant. Analyze the group's schedule and logistics information to determine the best travel dates for their trip to ${groupData.destination_display}.

GROUP MEMBER SCHEDULES AND LOGISTICS:
${memberSchedules.map(member => `
**${member.name}:**
- Schedule & Logistics: ${member.schedule}
- Flight Preference: ${member.flightPreference}
`).join('\n')}

HOST FALLBACK LOCATION: ${hostProfile ? `${hostProfile.state}, ${hostProfile.country}` : 'Not available'}

This is a ${groupDescription} planning a trip to ${groupData.destination_display}.

INSTRUCTIONS:
1. ${scheduleAnalysis}
2. Determine optimal departure and return dates that work for everyone
3. Only plan the trip for the days the people are free on.
3. Calculate trip duration in days
4. Identify the most common departure location mentioned by members
5. If no departure locations are mentioned, use the host's location as fallback
6. Provide IATA airport code for the departure location
7. Provide IATA airport code for the destination (${groupData.destination_display})

${isSinglePerson ? `
SOLO TRAVELER GUIDELINES:
- If no specific dates are mentioned, suggest dates 2-4 weeks from now
- Use the traveler's location or host fallback location for departure
` : ''}

CRITICAL DATE REQUIREMENTS:
- ALL dates must be in the FUTURE (after today's date: ${new Date().toISOString().split('T')[0]})
- If a member mentions dates without a year, assume the NEXT occurrence of those dates
- If dates mentioned have already passed this year, use next year
- NEVER generate dates in the past
- Default to dates 2-4 weeks from today if no specific dates are mentioned

Return your response in the following EXACT JSON format:

{
  "departure_date": "2025-07-26",
  "return_date": "2025-08-02",
  "trip_duration_days": 7,
  "departure_location": "Chennai",
  "departure_iata_code": "MAA",
  "destination_iata_code": "JFK",
  "reasoning": "Brief explanation of why these dates and location were chosen"
}

REQUIREMENTS:
- Dates must be in YYYY-MM-DD format
- ALL dates must be in the future (after ${new Date().toISOString().split('T')[0]})
- Trip duration should be realistic (3-14 days typically)
${isSinglePerson ? '- For solo travelers, if no schedule constraints mentioned, pick optimal dates 2-4 weeks from now' : ''}
- IATA code must be valid 3-letter airport code
- Destination IATA code should be the main airport for ${groupData.destination_display}
${isSinglePerson 
  ? '- Use the departure location mentioned by the traveler, or host location as fallback'
  : `- If multiple departure locations, choose the one mentioned by majority
- If tied or unclear, use host location as fallback`
}
- ALWAYS provide a complete JSON response with all required fields
- Consider work schedules, holidays, and availability mentioned by members
- If member mentions "September 6-9" without year, and it's already past September 9 this year, use next year
- Default to 2-4 weeks from today if no specific dates work for everyone
`;

    console.log('🤖 Sending request to Gemini AI...');
    console.log('🤖 Prompt length:', prompt.length, 'characters');

    // Generate travel dates using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });
    
    try {
      const result = await model.generateContent(prompt);
      console.log('✅ Gemini AI response received');
      
      const response = await result.response;
      const text = response.text();
      console.log('🤖 Raw Gemini response:', text);

      // Parse the JSON response
      let travelDatesData;
      try {
        console.log('📝 Parsing JSON response...');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          travelDatesData = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON parsed successfully:', travelDatesData);
        } else {
          console.error('❌ No JSON found in Gemini response');
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini response:', parseError);
        console.error('❌ Raw response:', text);
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }

      console.log('🔗 Generating booking URL...');
      // Generate booking URL directly
      const adultCount = membersData?.length || 1;
      console.log('👥 Adult count for booking:', adultCount);
      
      const bookingUrlParams = {
        from: travelDatesData.departure_iata_code,
        to: travelDatesData.destination_iata_code,
        departDate: travelDatesData.departure_date,
        returnDate: travelDatesData.return_date,
        adults: adultCount,
        cabinClass: flightClass
      };
      
      const bookingUrl = constructBookingUrl(bookingUrlParams);

      console.log('💾 Updating travel group in database...');
      // Update the travel group with determined dates, flight info, and booking URL
      const updateData = {
        departure_date: travelDatesData.departure_date,
        return_date: travelDatesData.return_date,
        trip_duration_days: travelDatesData.trip_duration_days,
        departure_location: travelDatesData.departure_location,
        departure_iata_code: travelDatesData.departure_iata_code,
        destination_iata_code: travelDatesData.destination_iata_code,
        flight_class: flightClass,
        travel_dates_determined: true,
        booking_url: bookingUrl
      };
      
      console.log('💾 Update data:', updateData);
      
      try {
        console.log('💾 Attempting Supabase update...');
        console.log('💾 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
        console.log('💾 Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
        
        const { data: updateResult, error: updateError, count } = await supabase
          .from('travel_groups')
          .update(updateData)
          .eq('group_id', groupId)
          .select();

        console.log('💾 Supabase update result:', {
          data: updateResult,
          error: updateError,
          count: count,
          rowsAffected: updateResult?.length || 0
        });

        if (updateError) {
          console.error('❌ Supabase update error details:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
            name: updateError.name || 'Unknown',
            stack: updateError.stack || 'No stack trace'
          });
          
          // Check if it's a network/connection error
          if (updateError.message?.includes('fetch failed') || updateError.message?.includes('network')) {
            console.error('❌ This appears to be a network/connection error to Supabase');
            console.error('❌ Possible causes:');
            console.error('   - Supabase service is down');
            console.error('   - Network connectivity issues');
            console.error('   - Invalid Supabase URL or credentials');
            console.error('   - Firewall blocking the connection');
          }
          
          return NextResponse.json({ 
            error: 'Failed to save travel dates to database',
            details: updateError.message,
            supabaseError: updateError
          }, { status: 500 });
        }

        if (!updateResult || updateResult.length === 0) {
          console.error('❌ No rows were updated - group may not exist');
          return NextResponse.json({ 
            error: 'No travel group found to update',
            groupId: groupId
          }, { status: 404 });
        }

        console.log('✅ Supabase update successful, rows affected:', updateResult.length);
        
      } catch (supabaseError) {
        console.error('❌ Unexpected error during Supabase update:', supabaseError);
        console.error('❌ Error type:', typeof supabaseError);
        console.error('❌ Error constructor:', supabaseError?.constructor?.name);
        
        if (supabaseError instanceof Error) {
          console.error('❌ Error details:', {
            name: supabaseError.name,
            message: supabaseError.message,
            stack: supabaseError.stack,
            cause: supabaseError.cause
          });
        }
        
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: supabaseError instanceof Error ? supabaseError.message : String(supabaseError)
        }, { status: 500 });
      }

      console.log('✅ Travel group updated successfully');

      // Create response data with error isolation
      let responseData;
      try {
        responseData = {
          success: true,
          data: {
            ...travelDatesData,
            flight_class: flightClass,
            booking_url: bookingUrl,
            adults: adultCount
          }
        };
        
        // Test JSON serialization
        JSON.stringify(responseData);
        console.log('✅ Response data serialization successful');
        
      } catch (serializationError) {
        console.error('❌ Response serialization error:', serializationError);
        
        // Fallback response with minimal data
        responseData = {
          success: true,
          data: {
            departure_date: travelDatesData.departure_date,
            return_date: travelDatesData.return_date,
            trip_duration_days: travelDatesData.trip_duration_days,
            flight_class: flightClass,
            message: 'Travel dates determined successfully (data saved to database)'
          }
        };
      }

      console.log('🎉 API call completed successfully');
      console.log('📤 Response data:', responseData);

      try {
        return NextResponse.json(responseData);
      } catch (responseError) {
        console.error('❌ Error sending response:', responseError);
        
        // Ultimate fallback - just confirm success
        return NextResponse.json({
          success: true,
          message: 'Travel dates determined and saved successfully'
        });
      }

    } catch (geminiError) {
      console.error('❌ Error calling Gemini AI:', geminiError);
      console.error('❌ Gemini error details:', {
        name: geminiError instanceof Error ? geminiError.name : 'Unknown',
        message: geminiError instanceof Error ? geminiError.message : String(geminiError),
        stack: geminiError instanceof Error ? geminiError.stack : 'No stack trace'
      });
      return NextResponse.json({ 
        error: 'Failed to generate travel dates with AI: ' + (geminiError instanceof Error ? geminiError.message : 'Unknown error')
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Unexpected error in determine-travel-dates:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      type: typeof error
    });
    return NextResponse.json(
      { error: 'Failed to determine travel dates: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}