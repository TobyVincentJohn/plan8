import neo4j, { Driver, Session } from 'neo4j-driver';

class Neo4jService {
  private driver: Driver | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
      console.warn('Neo4j credentials not configured. Knowledge graph features disabled.');
      return;
    }

    try {
      this.driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
      );
      console.log('✅ Neo4j connection established');
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j:', error);
    }
  }

  private getSession(): Session | null {
    if (!this.driver) {
      return null;
    }
    return this.driver.session();
  }

  async createUserNode(userId: string, userProfile: any) {
    const session = this.getSession();
    if (!session) return null;

    try {
      const result = await session.run(
        `
        MERGE (u:User {id: $userId})
        SET u.firstName = $firstName,
            u.lastName = $lastName,
            u.email = $email,
            u.country = $country,
            u.state = $state,
            u.updatedAt = datetime()
        RETURN u
        `,
        {
          userId,
          firstName: userProfile.firstName || '',
          lastName: userProfile.lastName || '',
          email: userProfile.email || '',
          country: userProfile.country || '',
          state: userProfile.state || ''
        }
      );
      return result.records[0]?.get('u');
    } catch (error) {
      console.error('Error creating user node:', error);
      return null;
    } finally {
      await session.close();
    }
  }

  async createTravelPreferences(userId: string, preferences: any) {
    const session = this.getSession();
    if (!session) return null;

    try {
      // Create preference nodes and relationships
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})
        
        // Create or update travel style preferences
        MERGE (ts:TravelStyle {name: $travelStyle})
        MERGE (u)-[:PREFERS_TRAVEL_STYLE]->(ts)
        
        // Create flight preference
        MERGE (fp:FlightPreference {type: $flightPreference})
        MERGE (u)-[:PREFERS_FLIGHT]->(fp)
        
        // Create budget preference
        MERGE (bp:BudgetRange {range: $budget})
        MERGE (u)-[:HAS_BUDGET]->(bp)
        
        // Create interests as separate nodes
        WITH u, split($interests, ',') as interestList
        UNWIND interestList as interest
        WITH u, trim(interest) as cleanInterest
        WHERE cleanInterest <> ''
        MERGE (i:Interest {name: cleanInterest})
        MERGE (u)-[:INTERESTED_IN]->(i)
        
        RETURN u
        `,
        {
          userId,
          travelStyle: preferences.travel_style_preferences || 'Unknown',
          flightPreference: preferences.flight_preference || 'Economy',
          budget: preferences.budget_and_spending || 'Unknown',
          interests: preferences.interests_and_activities || ''
        }
      );

      // Create deal breakers
      if (preferences.deal_breakers_and_strong_preferences) {
        await session.run(
          `
          MATCH (u:User {id: $userId})
          MERGE (db:DealBreaker {description: $dealBreakers})
          MERGE (u)-[:AVOIDS]->(db)
          `,
          {
            userId,
            dealBreakers: preferences.deal_breakers_and_strong_preferences
          }
        );
      }

      return result.records[0]?.get('u');
    } catch (error) {
      console.error('Error creating travel preferences:', error);
      return null;
    } finally {
      await session.close();
    }
  }

  async createTripNode(groupId: string, tripData: any) {
    const session = this.getSession();
    if (!session) return null;

    try {
      const result = await session.run(
        `
        MERGE (t:Trip {groupId: $groupId})
        SET t.destination = $destination,
            t.destinationDisplay = $destinationDisplay,
            t.departureDate = $departureDate,
            t.returnDate = $returnDate,
            t.duration = $duration,
            t.createdAt = datetime(),
            t.budgetRange = $budgetRange
        
        // Connect to destination
        MERGE (d:Destination {name: $destinationDisplay})
        MERGE (t)-[:TRAVELS_TO]->(d)
        
        RETURN t
        `,
        {
          groupId,
          destination: tripData.destination || '',
          destinationDisplay: tripData.destination_display || '',
          departureDate: tripData.departure_date || '',
          returnDate: tripData.return_date || '',
          duration: tripData.trip_duration_days || 0,
          budgetRange: tripData.budgetRange || ''
        }
      );
      return result.records[0]?.get('t');
    } catch (error) {
      console.error('Error creating trip node:', error);
      return null;
    } finally {
      await session.close();
    }
  }

  async linkUserToTrip(userId: string, groupId: string) {
    const session = this.getSession();
    if (!session) return null;

    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        MATCH (t:Trip {groupId: $groupId})
        MERGE (u)-[:PARTICIPATED_IN]->(t)
        `,
        { userId, groupId }
      );
    } catch (error) {
      console.error('Error linking user to trip:', error);
    } finally {
      await session.close();
    }
  }

  async addItineraryData(groupId: string, itineraryData: any) {
    const session = this.getSession();
    if (!session) return null;

    try {
      // Add places visited
      for (const day of itineraryData.itinerary) {
        for (const place of day.places) {
          await session.run(
            `
            MATCH (t:Trip {groupId: $groupId})
            MERGE (p:Place {name: $placeName})
            SET p.type = $type,
                p.description = $description,
                p.duration = $duration
            MERGE (t)-[:INCLUDES_PLACE]->(p)
            
            // Connect place to destination
            MATCH (d:Destination {name: $destination})
            MERGE (p)-[:LOCATED_IN]->(d)
            `,
            {
              groupId,
              placeName: place.name,
              type: place.type || 'Unknown',
              description: place.description || '',
              duration: place.duration || '',
              destination: itineraryData.destination || ''
            }
          );
        }
      }

      // Add hotels
      if (itineraryData.hotels) {
        for (const hotel of itineraryData.hotels) {
          await session.run(
            `
            MATCH (t:Trip {groupId: $groupId})
            MERGE (h:Hotel {name: $hotelName})
            SET h.rating = $rating,
                h.price = $price,
                h.amenities = $amenities
            MERGE (t)-[:STAYED_AT]->(h)
            `,
            {
              groupId,
              hotelName: hotel.name,
              rating: hotel.rating || 0,
              price: hotel.price || '',
              amenities: JSON.stringify(hotel.amenities || [])
            }
          );
        }
      }
    } catch (error) {
      console.error('Error adding itinerary data:', error);
    } finally {
      await session.close();
    }
  }

  async getUserTravelContext(userId: string): Promise<any> {
    const session = this.getSession();
    if (!session) return null;

    try {
      const result = await session.run(
        `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[:PREFERS_TRAVEL_STYLE]->(ts:TravelStyle)
        OPTIONAL MATCH (u)-[:PREFERS_FLIGHT]->(fp:FlightPreference)
        OPTIONAL MATCH (u)-[:HAS_BUDGET]->(bp:BudgetRange)
        OPTIONAL MATCH (u)-[:INTERESTED_IN]->(i:Interest)
        OPTIONAL MATCH (u)-[:AVOIDS]->(db:DealBreaker)
        OPTIONAL MATCH (u)-[:PARTICIPATED_IN]->(t:Trip)-[:TRAVELS_TO]->(d:Destination)
        OPTIONAL MATCH (t)-[:INCLUDES_PLACE]->(p:Place)
        OPTIONAL MATCH (t)-[:STAYED_AT]->(h:Hotel)
        
        RETURN u,
               collect(DISTINCT ts.name) as travelStyles,
               collect(DISTINCT fp.type) as flightPrefs,
               collect(DISTINCT bp.range) as budgetRanges,
               collect(DISTINCT i.name) as interests,
               collect(DISTINCT db.description) as dealBreakers,
               collect(DISTINCT d.name) as visitedDestinations,
               collect(DISTINCT p.name) as visitedPlaces,
               collect(DISTINCT h.name) as stayedHotels
        `,
        { userId }
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      return {
        user: record.get('u'),
        travelStyles: record.get('travelStyles'),
        flightPreferences: record.get('flightPrefs'),
        budgetRanges: record.get('budgetRanges'),
        interests: record.get('interests'),
        dealBreakers: record.get('dealBreakers'),
        visitedDestinations: record.get('visitedDestinations'),
        visitedPlaces: record.get('visitedPlaces'),
        stayedHotels: record.get('stayedHotels')
      };
    } catch (error) {
      console.error('Error getting user travel context:', error);
      return null;
    } finally {
      await session.close();
    }
  }

  async getDestinationInsights(destination: string): Promise<any> {
    const session = this.getSession();
    if (!session) return null;

    try {
      const result = await session.run(
        `
        MATCH (d:Destination {name: $destination})
        OPTIONAL MATCH (d)<-[:TRAVELS_TO]-(t:Trip)
        OPTIONAL MATCH (t)-[:INCLUDES_PLACE]->(p:Place)-[:LOCATED_IN]->(d)
        OPTIONAL MATCH (t)-[:STAYED_AT]->(h:Hotel)
        OPTIONAL MATCH (t)<-[:PARTICIPATED_IN]-(u:User)-[:INTERESTED_IN]->(i:Interest)
        
        RETURN d,
               count(DISTINCT t) as totalTrips,
               collect(DISTINCT p.name) as popularPlaces,
               collect(DISTINCT h.name) as popularHotels,
               collect(DISTINCT i.name) as commonInterests,
               avg(t.duration) as avgDuration
        `,
        { destination }
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      return {
        destination: record.get('d'),
        totalTrips: record.get('totalTrips').toNumber(),
        popularPlaces: record.get('popularPlaces'),
        popularHotels: record.get('popularHotels'),
        commonInterests: record.get('commonInterests'),
        averageDuration: record.get('avgDuration')
      };
    } catch (error) {
      console.error('Error getting destination insights:', error);
      return null;
    } finally {
      await session.close();
    }
  }

  async addUserDestinationInterest(userId: string, destination: string) {
    const session = this.getSession();
    if (!session) return null;

    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        MERGE (d:Destination {name: $destination})
        MERGE (u)-[:INTERESTED_IN_DESTINATION]->(d)
        `,
        { userId, destination }
      );
    } catch (error) {
      console.error('Error adding destination interest:', error);
    } finally {
      await session.close();
    }
  }

  async addUserActivityInterest(userId: string, activity: string) {
    const session = this.getSession();
    if (!session) return null;

    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        MERGE (a:Activity {name: $activity})
        MERGE (u)-[:ENJOYS_ACTIVITY]->(a)
        `,
        { userId, activity }
      );
    } catch (error) {
      console.error('Error adding activity interest:', error);
    } finally {
      await session.close();
    }
  }

  async addUserConstraint(userId: string, constraint: string) {
    const session = this.getSession();
    if (!session) return null;

    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        MERGE (c:Constraint {description: $constraint})
        MERGE (u)-[:HAS_CONSTRAINT]->(c)
        `,
        { userId, constraint }
      );
    } catch (error) {
      console.error('Error adding user constraint:', error);
    } finally {
      await session.close();
    }
  }

  async addUserBudgetInsights(userId: string, budgetIndicators: string[]) {
    const session = this.getSession();
    if (!session) return null;

    try {
      for (const indicator of budgetIndicators) {
        await session.run(
          `
          MATCH (u:User {id: $userId})
          MERGE (bi:BudgetIndicator {description: $indicator})
          MERGE (u)-[:HAS_BUDGET_INDICATOR]->(bi)
          `,
          { userId, indicator }
        );
      }
    } catch (error) {
      console.error('Error adding budget insights:', error);
    } finally {
      await session.close();
    }
  }

  async updateUserTravelStyle(userId: string, travelStyle: string) {
    const session = this.getSession();
    if (!session) return null;

    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        MERGE (ts:TravelStyle {name: $travelStyle})
        MERGE (u)-[:PREFERS_TRAVEL_STYLE]->(ts)
        `,
        { userId, travelStyle }
      );
    } catch (error) {
      console.error('Error updating travel style:', error);
    } finally {
      await session.close();
    }
  }

  async addGroupDynamics(groupId: string, dynamics: string[]) {
    const session = this.getSession();
    if (!session) return null;

    try {
      for (const dynamic of dynamics) {
        await session.run(
          `
          MATCH (t:Trip {groupId: $groupId})
          MERGE (gd:GroupDynamic {description: $dynamic})
          MERGE (t)-[:HAS_GROUP_DYNAMIC]->(gd)
          `,
          { groupId, dynamic }
        );
      }
    } catch (error) {
      console.error('Error adding group dynamics:', error);
    } finally {
      await session.close();
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
    }
  }
}

export const neo4jService = new Neo4jService(); 