import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { groupId, userId, feedback } = await request.json();

    if (!groupId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update user's feedback and regenerate vote
    const { error: updateError } = await supabase
      .from('group_members')
      .update({
        itinerary_feedback: feedback,
        regenerate_vote: true
      })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error in submit feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}