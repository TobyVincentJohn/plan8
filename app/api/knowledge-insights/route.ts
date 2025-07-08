import { NextRequest, NextResponse } from 'next/server';
import { knowledgeGraphProcessor } from '@/lib/knowledgeGraphProcessor';
import { neo4jService } from '@/lib/neo4jClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const destination = searchParams.get('destination');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'recommendations':
        const recommendations = await knowledgeGraphProcessor.getPersonalizedRecommendations(
          userId, 
          destination || undefined
        );
        
        return NextResponse.json({
          success: true,
          data: recommendations
        });

      case 'travel-context':
        const context = await neo4jService.getUserTravelContext(userId);
        
        return NextResponse.json({
          success: true,
          data: context
        });

      case 'destination-insights':
        if (!destination) {
          return NextResponse.json({ error: 'Destination is required for insights' }, { status: 400 });
        }
        
        const insights = await neo4jService.getDestinationInsights(destination);
        
        return NextResponse.json({
          success: true,
          data: insights
        });

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in knowledge insights API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge insights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, transcript, groupId } = await request.json();

    if (!userId || !transcript) {
      return NextResponse.json({ 
        error: 'User ID and transcript are required' 
      }, { status: 400 });
    }

    // Process conversation transcript and extract insights
    const insights = await knowledgeGraphProcessor.processConversationTranscript(
      transcript, 
      userId, 
      groupId
    );

    return NextResponse.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error processing conversation transcript:', error);
    return NextResponse.json(
      { error: 'Failed to process conversation transcript' },
      { status: 500 }
    );
  }
} 