# Plan8 - AI-Powered Travel Planning with Knowledge Graph

Plan8 is an intelligent travel planning platform that leverages AI and a Neo4j knowledge graph to create personalized itineraries. The system learns from user preferences and historical data to provide increasingly better travel recommendations.

## 🚀 Features

### Core Travel Planning
- **AI-Powered Itinerary Generation** using Groq (Llama 3.1)
- **Voice Preference Collection** via ElevenLabs conversational AI
- **Real-time Flight Integration** with Booking.com
- **Interactive Maps** with Google Maps integration
- **Group Travel Planning** with collaborative features
- **Hotel Recommendations** based on preferences and budget

### 🧠 Knowledge Graph Intelligence
- **Neo4j Knowledge Graph** for persistent learning
- **User Travel Profiles** with historical preferences
- **Destination Insights** from community data
- **Activity Pattern Recognition** 
- **Personalized Recommendations** based on travel history
- **Conversation Analysis** for preference extraction
- **Relationship Mapping** between users, trips, and destinations

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Groq AI       │    │   Neo4j Graph   │
│   (Frontend)    │◄──►│   (LLM)         │◄──►│   (Knowledge)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   ElevenLabs    │    │   Google APIs   │
│   (Database)    │    │   (Voice AI)    │    │   (Maps/Places) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **AI/LLM**: Groq (Llama 3.1)
- **Knowledge Graph**: Neo4j
- **Database**: Supabase (PostgreSQL)
- **Voice AI**: ElevenLabs
- **Maps**: Google Maps API
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Neo4j database (AuraDB recommended)
- Supabase project
- API keys for:
  - Groq
  - ElevenLabs
  - Google Maps/Places
  - Unsplash

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/plan8.git
cd plan8
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file:

```env
# Groq AI API Key
GROQ_API_KEY=your_groq_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google APIs
GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Unsplash API
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Neo4j Knowledge Graph Database
NEO4J_URI=neo4j+s://your-neo4j-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Optional - for deployment
URL=your_deployment_url
```

### 4. Database Setup
Run Supabase migrations:
```bash
npx supabase db push
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🧠 Knowledge Graph Schema

### Node Types
- **User**: Individual travelers with preferences
- **Trip**: Planned travel itineraries
- **Destination**: Cities/countries to visit
- **Place**: Specific attractions or locations
- **Hotel**: Accommodation options
- **Interest**: User activity preferences
- **TravelStyle**: Travel behavior patterns
- **Constraint**: Travel limitations or deal-breakers

### Relationships
- `User -[:PREFERS_TRAVEL_STYLE]-> TravelStyle`
- `User -[:INTERESTED_IN]-> Interest`
- `User -[:PARTICIPATED_IN]-> Trip`
- `Trip -[:TRAVELS_TO]-> Destination`
- `Trip -[:INCLUDES_PLACE]-> Place`
- `Place -[:LOCATED_IN]-> Destination`
- `Trip -[:STAYED_AT]-> Hotel`

## 🔌 API Endpoints

### Travel Planning
- `POST /api/determine-travel-dates` - Analyze schedules and set trip dates
- `POST /api/generate-itinerary` - Create AI-powered itineraries
- `POST /api/regenerate-itinerary` - Update itineraries based on feedback

### Knowledge Graph
- `GET /api/knowledge-insights?action=recommendations&userId={id}` - Get personalized recommendations
- `GET /api/knowledge-insights?action=travel-context&userId={id}` - Get user travel history
- `GET /api/knowledge-insights?action=destination-insights&destination={name}` - Get destination data
- `POST /api/knowledge-insights` - Process conversation transcripts

### Webhooks
- `POST /api/webhooks/elevenlabs` - ElevenLabs conversation completion webhook

### Utilities
- `POST /api/autocomplete` - Location autocomplete
- `POST /api/fetch-flights` - Flight data scraping
- `POST /api/vote-place` - Group voting on destinations

## 🎯 How It Works

### 1. User Onboarding
```typescript
// User creates account and completes profile
const profile = {
  name: "John Doe",
  location: "New York, USA",
  preferences: {...}
}
```

### 2. Voice Preference Collection
```typescript
// ElevenLabs webhook processes conversation
const preferences = await extractTravelPreferences(transcript);
await neo4jService.createTravelPreferences(userId, preferences);
```

### 3. Knowledge Graph Learning
```typescript
// AI extracts insights from conversations
const insights = await knowledgeGraphProcessor.processConversationTranscript(
  transcript, userId, groupId
);
```

### 4. Intelligent Itinerary Generation
```typescript
// System leverages knowledge graph for context
const userContext = await neo4jService.getUserTravelContext(userId);
const destinationInsights = await neo4jService.getDestinationInsights(destination);

// Enhanced AI prompt with historical data
const prompt = `Create itinerary with context: ${userContext}...`;
```

### 5. Continuous Learning
```typescript
// Trip completion stores data for future use
await neo4jService.createTripNode(groupId, tripData);
await neo4jService.addItineraryData(groupId, itineraryData);
```

## 🌟 Key Features

### Intelligent Recommendations
- **Historical Analysis**: Learns from past trips and preferences
- **Pattern Recognition**: Identifies travel behavior patterns
- **Community Insights**: Leverages data from similar travelers
- **Contextual Suggestions**: Considers user constraints and deal-breakers

### Voice AI Integration
- **Natural Conversations**: ElevenLabs voice interface for preference collection
- **Automatic Processing**: AI extracts structured data from conversations
- **Preference Evolution**: Tracks changing user preferences over time

### Group Collaboration
- **Shared Planning**: Multiple users collaborate on trip planning
- **Voting System**: Democratic decision-making for destinations
- **Preference Aggregation**: AI balances different group member preferences

### Real-time Data
- **Live Flight Prices**: Integration with Booking.com for current flight data
- **Dynamic Pricing**: Real-time hotel and activity pricing
- **Weather Integration**: Season-appropriate recommendations

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Environment Variables in Production
Ensure all environment variables are set in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

## 🔮 Roadmap

- [ ] Mobile app development
- [ ] Advanced ML recommendation algorithms
- [ ] Real-time collaborative editing
- [ ] Multi-language support
- [ ] Expense tracking integration
- [ ] Social features and trip sharing
- [ ] Weather-based activity suggestions
- [ ] Carbon footprint calculation

## 🙏 Acknowledgments

- Groq for providing fast LLM inference
- Neo4j for the knowledge graph database
- ElevenLabs for conversational AI
- Supabase for the backend infrastructure
- Google for Maps and Places APIs

---

Built with ❤️ using Next.js, Neo4j, and AI 