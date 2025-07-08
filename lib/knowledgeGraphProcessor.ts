import Groq from 'groq-sdk';
import { neo4jService } from './neo4jClient';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

interface ExtractedInsights {
  destinations: string[];
  activities: string[];
  preferences: string[];
  constraints: string[];
  budget_indicators: string[];
  travel_style: string;
  group_dynamics: string[];
  seasonal_preferences: string[];
  accommodation_preferences: string[];
}

export class KnowledgeGraphProcessor {
  
  async processConversationTranscript(
    transcript: string, 
    userId: string, 
    groupId?: string
  ): Promise<ExtractedInsights | null> {
    try {
      console.log('🧠 Processing conversation transcript for knowledge graph...');
      
      const extractionPrompt = `
You are an AI assistant specialized in extracting travel-related insights from conversation transcripts. 
Analyze the following conversation transcript and extract structured travel information.

TRANSCRIPT:
${transcript}

Please extract and return the following information in JSON format:
{
  "destinations": ["array of destinations mentioned or shown interest in"],
  "activities": ["array of activities, attractions, or experiences mentioned"],
  "preferences": ["array of specific travel preferences mentioned"],
  "constraints": ["array of limitations, budget constraints, or deal-breakers"],
  "budget_indicators": ["array of budget-related mentions or spending preferences"],
  "travel_style": "single travel style classification (luxury, budget, adventure, relaxation, cultural, etc.)",
  "group_dynamics": ["array of group-related preferences or mentions"],
  "seasonal_preferences": ["array of seasonal or timing preferences"],
  "accommodation_preferences": ["array of hotel, resort, or accommodation preferences"]
}

Focus on extracting meaningful insights that can help with future travel planning.
Return only the JSON object, no additional text.
`;

      const result = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0.3,
      });

      const extractedText = result.choices[0].message.content || '';
      
      // Parse JSON response
      let insights: ExtractedInsights;
      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI extraction response:', parseError);
        return null;
      }

      // Store insights in knowledge graph
      await this.storeInsightsInGraph(insights, userId, groupId);
      
      return insights;
    } catch (error) {
      console.error('Error processing conversation transcript:', error);
      return null;
    }
  }

  private async storeInsightsInGraph(
    insights: ExtractedInsights, 
    userId: string, 
    groupId?: string
  ): Promise<void> {
    try {
      // Store destinations of interest
      for (const destination of insights.destinations) {
        await neo4jService.addUserDestinationInterest(userId, destination);
      }

      // Store activity preferences
      for (const activity of insights.activities) {
        await neo4jService.addUserActivityInterest(userId, activity);
      }

      // Store travel constraints
      for (const constraint of insights.constraints) {
        await neo4jService.addUserConstraint(userId, constraint);
      }

      // Store budget insights
      if (insights.budget_indicators.length > 0) {
        await neo4jService.addUserBudgetInsights(userId, insights.budget_indicators);
      }

      // Store travel style
      if (insights.travel_style) {
        await neo4jService.updateUserTravelStyle(userId, insights.travel_style);
      }

      // If part of a group, store group dynamics
      if (groupId && insights.group_dynamics.length > 0) {
        await neo4jService.addGroupDynamics(groupId, insights.group_dynamics);
      }

      console.log('✅ Insights stored in knowledge graph successfully');
    } catch (error) {
      console.error('Error storing insights in knowledge graph:', error);
    }
  }

  async getPersonalizedRecommendations(userId: string, destination?: string): Promise<any> {
    try {
      // Get user's travel context from knowledge graph
      const userContext = await neo4jService.getUserTravelContext(userId);
      
      if (!userContext) {
        return null;
      }

      // Get destination insights if specified
      let destinationInsights = null;
      if (destination) {
        destinationInsights = await neo4jService.getDestinationInsights(destination);
      }

      // Generate personalized recommendations using AI
      const recommendationPrompt = `
Based on the following user travel profile and destination data, provide personalized travel recommendations:

USER PROFILE:
- Travel Styles: ${userContext.travelStyles.join(', ')}
- Interests: ${userContext.interests.join(', ')}
- Deal Breakers: ${userContext.dealBreakers.join(', ')}
- Budget Ranges: ${userContext.budgetRanges.join(', ')}
- Previously Visited: ${userContext.visitedDestinations.join(', ')}
- Preferred Hotels: ${userContext.stayedHotels.join(', ')}

${destinationInsights ? `
DESTINATION INSIGHTS for ${destination}:
- Total trips by other users: ${destinationInsights.totalTrips}
- Popular places: ${destinationInsights.popularPlaces.join(', ')}
- Popular hotels: ${destinationInsights.popularHotels.join(', ')}
- Common interests of visitors: ${destinationInsights.commonInterests.join(', ')}
- Average trip duration: ${destinationInsights.averageDuration} days
` : ''}

Provide specific, personalized recommendations for:
1. Destinations (if not specified)
2. Activities and attractions
3. Accommodation types
4. Budget considerations
5. Trip duration
6. Best travel times

Return recommendations in a structured format.
`;

      const result = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: recommendationPrompt }],
        temperature: 0.7,
      });

      return {
        recommendations: result.choices[0].message.content,
        userContext,
        destinationInsights
      };
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return null;
    }
  }
}

export const knowledgeGraphProcessor = new KnowledgeGraphProcessor(); 