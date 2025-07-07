import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Extract user_id and group_id from webhook payload
function extractUserContext(webhookData: any) {
  try {
    console.log('🔍 Looking for user context in webhook payload...');

    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;

    if (dynamicVars?.user_id && dynamicVars?.group_id) {
      const userId = dynamicVars.user_id;
      const groupId = dynamicVars.group_id;
      console.log('✅ Found user context:', { userId, groupId });
      return { userId, groupId };
    }

    console.error('❌ Could not find user_id or group_id in conversation_initiation_client_data.dynamic_variables');
    return { userId: null, groupId: null };
  } catch (error) {
    console.error('❌ Error extracting user context:', error);
    return { userId: null, groupId: null };
  }
}

// Extract travel preferences from webhook payload
function extractTravelPreferences(webhookData: any) {
  try {
    console.log('🔍 Extracting travel preferences...');

    const results = webhookData.data?.analysis?.data_collection_results;

    if (!results) {
      console.error('❌ No data_collection_results found');
      return null;
    }

    const preferences = {
      deal_breakers_and_strong_preferences: results.deal_breakers_and_strong_preferences?.value || null,
      interests_and_activities: results.interests_and_activities?.value || null,
      nice_to_haves_and_openness: results.nice_to_haves_and_openness?.value || null,
      travel_motivations: results.travel_motivations?.value || null,
      must_do_experiences: results.must_do_experiences?.value || null,
      learning_interests: results.learning_interests?.value || null,
      schedule_and_logistics: results.schedule_and_logistics?.value || null,
      budget_and_spending: results.budget_and_spending?.value || null,
      travel_style_preferences: results.travel_style_preferences?.value || null,
      flight_preference: results.flight_preference?.value || null,
    };

    console.log('✅ Extracted preferences:', preferences);
    return preferences;
  } catch (error) {
    console.error('❌ Error extracting travel preferences:', error);
    return null;
  }
}

// Update group member preferences in database
async function updateMemberPreferences(userId: string, groupId: string, preferences: any) {
  try {
    console.log('💾 Updating preferences for user:', userId, 'in group:', groupId);
    console.log('📦 Preferences:', preferences);

    const { data, error } = await supabase
      .from('group_members')
      .update({
        ...preferences,
        preferences_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Preferences updated:', data);
    return data;
  } catch (error) {
    console.error('❌ Error updating member preferences:', error);
    throw error;
  }
}

// POST webhook handler
export async function POST(request: NextRequest) {
  console.log('🚀 ElevenLabs webhook endpoint hit');

  try {
    const webhookData = await request.json();

    console.log('📨 Webhook received:', {
      eventType: webhookData.event_type || 'unknown',
      conversationId: webhookData.data?.conversation_id,
      agentId: webhookData.data?.agent_id,
    });

    const { userId, groupId } = extractUserContext(webhookData);

    if (!userId || !groupId) {
      return NextResponse.json(
        {
          error: 'Could not extract user_id and group_id from webhook payload',
          conversationId: webhookData.data?.conversation_id,
        },
        { status: 400 }
      );
    }

    const preferences = extractTravelPreferences(webhookData);

    if (!preferences) {
      return NextResponse.json(
        {
          error: 'Failed to extract preferences',
          conversationId: webhookData.data?.conversation_id,
        },
        { status: 500 }
      );
    }

    await updateMemberPreferences(userId, groupId, preferences);

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      conversationId: webhookData.data?.conversation_id,
      userId,
      groupId,
    });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || error,
      },
      { status: 500 }
    );
  }
}

// GET webhook healthcheck
export async function GET() {
  return NextResponse.json({
    message: 'ElevenLabs webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
