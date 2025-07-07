import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';
import { getPlaceImage } from '@/lib/getLocationImage';
import { getPlaceCoordinates } from '@/lib/utils';
import { getAllTravelModes } from '@/lib/getRoute';
import { getGooglePlacePhotoUrl } from '@/lib/getPlacePhoto';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { groupId, userId, feedback } = await request.json();

    if (!groupId || !userId) {
      return NextResponse.json({ error: 'Group ID and User ID are required' }, { status: 400 });
    }

    // Update user's regenerate vote and feedback
    const { error: voteError } = await supabase
      .from('group_members')
      .update({ regenerate_vote: true, itinerary_feedback: feedback })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (voteError) {
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
    }

    // Check if all members have voted
    const { data: allMembers, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, regenerate_vote')
      .eq('group_id', groupId);

    if (membersError) {
      return NextResponse.json({ error: 'Failed to check votes' }, { status: 500 });
    }

    const totalMembers = allMembers.length;
    const regenerateVotes = allMembers.filter(member => member.regenerate_vote).length;
    const majorityThreshold = totalMembers === 2 ? 2 : Math.ceil(totalMembers / 2);

    // Check if majority have voted to regenerate
    if (regenerateVotes >= majorityThreshold) {
      // Get group data including original API response and member preferences
      const { data: groupData, error: groupError } = await supabase
        .from('travel_groups')
        .select('most_recent_api_call, destination, destination_display, departure_date, return_date, trip_duration_days')
        .eq('group_id', groupId)
        .single();

      if (groupError || !groupData.most_recent_api_call) {
        return NextResponse.json({ error: 'Failed to get original API response' }, { status: 500 });
      }

      // Get all member feedback and preferences
      const { data: membersWithFeedback, error: feedbackError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          itinerary_feedback,
          deal_breakers_and_strong_preferences,
          interests_and_activities,
          nice_to_haves_and_openness,
          travel_motivations,
          must_do_experiences,
          learning_interests,
          schedule_and_logistics,
          budget_and_spending,
          travel_style_preferences,
          flight_preference,
          profiles!group_members_user_id_fkey(first_name, last_name)
        `)
        .eq('group_id', groupId);

      if (feedbackError) {
        return NextResponse.json({ error: 'Failed to get member feedback' }, { status: 500 });
      }

      // Collect all feedback
      const allFeedback = membersWithFeedback
        .filter(member => member.itinerary_feedback)
        .map(member => ({
          name: `${(member.profiles as any).first_name} ${(member.profiles as any).last_name}`,
          feedback: member.itinerary_feedback
        }));

      // Format member preferences for Gemini
      const memberPreferences = membersWithFeedback.map(member => ({
        name: `${(member.profiles as any).first_name} ${(member.profiles as any).last_name}`,
        dealBreakers: member.deal_breakers_and_strong_preferences,
        interests: member.interests_and_activities,
        niceToHaves: member.nice_to_haves_and_openness,
        motivations: member.travel_motivations,
        mustDo: member.must_do_experiences,
        learning: member.learning_interests,
        schedule: member.schedule_and_logistics,
        budget: member.budget_and_spending,
        travelStyle: member.travel_style_preferences,
        flightPreference: member.flight_preference
      }));

      // Create regeneration prompt
      const regenerationPrompt = `
You are a professional travel planner. I need you to update an existing itinerary based on group voting feedback.

TRAVEL DATES AND DURATION:
- Departure Date: ${groupData.departure_date}
- Return Date: ${groupData.return_date}
- Trip Duration: ${groupData.trip_duration_days} days
- You MUST maintain exactly ${groupData.trip_duration_days} days in the itinerary

GROUP MEMBER PREFERENCES:
${memberPreferences.map(member => `
**${member.name}:**
- Deal Breakers: ${member.dealBreakers || 'None specified'}
- Interests: ${member.interests || 'None specified'}
- Nice to Haves: ${member.niceToHaves || 'None specified'}
- Motivations: ${member.motivations || 'None specified'}
- Must Do: ${member.mustDo || 'None specified'}
- Learning Interests: ${member.learning || 'None specified'}
- Schedule: ${member.schedule || 'None specified'}
- Budget: ${member.budget || 'None specified'}
- Travel Style: ${member.travelStyle || 'None specified'}
- Flight Preference: ${member.flightPreference || 'None specified'}
`).join('\n')}

ORIGINAL ITINERARY RESPONSE:
${groupData.most_recent_api_call.response}

GROUP FEEDBACK:
${allFeedback.map(fb => `
**${fb.name}:**
${fb.feedback}
`).join('\n')}

INSTRUCTIONS:
1. Carefully analyze the group feedback to understand what they liked and what they want changed.
2. Keep elements that received positive feedback.
3. Replace or modify elements that received negative feedback or suggestions for improvement.
4. Maintain the same JSON structure as the original response.
5. Keep the same budget range, arrival IATA code, hotels, and flights unless specifically mentioned in feedback.
6. Ensure new places align with group preferences and feedback.
7. CRITICAL: Maintain the exact same dates from ${groupData.departure_date} to ${groupData.return_date}
8. CRITICAL: Keep exactly ${groupData.trip_duration_days} days in the itinerary
9. Address each piece of feedback thoughtfully while maintaining overall trip coherence.

Return the updated itinerary in the EXACT same JSON format as the original response.
`;

      // Generate updated itinerary using Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });
      const result = await model.generateContent(regenerationPrompt);
      const response = await result.response;
      const text = response.text();

      // Log the full LLM API call (prompt and response)
      console.log('LLM Regeneration Prompt:', regenerationPrompt);
      console.log('LLM Regeneration Response:', text);

      // Store the new API response
      const newApiResponse = {
        prompt: regenerationPrompt,
        response: text,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.5-flash-lite-preview-06-17',
        type: 'regeneration'
      };

      // Parse the JSON response
      let updatedItineraryData;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          updatedItineraryData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini regeneration response:', parseError);
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }

      // Enhance images and coordinates (same as original generation)
      for (const day of updatedItineraryData.itinerary) {
        for (const place of day.places) {
          place.image = await getGooglePlacePhotoUrl(`${place.name} ${groupData.destination_display || groupData.destination}`)
            || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&h=200&fit=crop';
          
          const coordinates = await getPlaceCoordinates(place.name, groupData.destination_display || groupData.destination);
          if (coordinates) {
            place.coordinates = coordinates;
          }
        }
        
        // Get travel modes between consecutive places
        for (let i = 1; i < day.places.length; i++) {
          const prev = day.places[i - 1];
          const curr = day.places[i];
          if (prev.coordinates && curr.coordinates) {
            const allModes = await getAllTravelModes(prev.coordinates, curr.coordinates);
            curr.travelModes = allModes;
          }
        }
      }

      // Enhance images for hotels
      for (const hotel of updatedItineraryData.hotels) {
        hotel.image = await getGooglePlacePhotoUrl(`${hotel.name} hotel ${groupData.destination_display || groupData.destination}`)
          || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&h=200&fit=crop';
      }

      // Format map locations
      updatedItineraryData.mapLocations = updatedItineraryData.itinerary.flatMap((day: any) =>
        day.places.map((place: any) => ({
          id: place.id,
          name: place.name,
          lat: place.coordinates?.lat || 0,
          lng: place.coordinates?.lng || 0,
          day: day.month,
          type: place.type,
          visitTime: place.visitTime,
          duration: place.duration
        }))
      );

      // Save the new itinerary and API call
      const { error: updateError } = await supabase
        .from('travel_groups')
        .update({
          itinerary: updatedItineraryData,
          most_recent_api_call: newApiResponse
        })
        .eq('group_id', groupId);

      if (updateError) {
        console.error('Error saving regenerated itinerary:', updateError);
        return NextResponse.json({ error: 'Failed to save regenerated itinerary' }, { status: 500 });
      }

      // Reset all regenerate_vote to false for all group members in the group
      const { error: resetVotesError } = await supabase
        .from('group_members')
        .update({ regenerate_vote: false, itinerary_feedback: null })
        .eq('group_id', groupId);
      if (resetVotesError) {
        console.error('Failed to reset regenerate_vote:', resetVotesError);
      }

      return NextResponse.json({
        success: true,
        regenerated: true,
        regenerateVotes: regenerateVotes,
        totalMembers
      });
    }

    return NextResponse.json({
      success: true,
      regenerated: false,
      regenerateVotes,
      totalMembers
    });

  } catch (error) {
    console.error('Error in regenerate itinerary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}