/*
  # Complete Database Schema for a2b.ai Travel Planning Application

  1. Tables Created
    - `profiles` - User profile information
    - `travel_groups` - Travel group details and itineraries
    - `group_members` - Group membership and preferences

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for authenticated users

  3. Indexes
    - Performance indexes for common queries
    - Foreign key relationships
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  profile_picture text,
  date_of_birth date NOT NULL,
  mobile_number text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL,
  post_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create travel_groups table
CREATE TABLE IF NOT EXISTS travel_groups (
  group_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination text NOT NULL,
  destination_display text NOT NULL,
  trip_name text,
  departure_date date,
  return_date date,
  trip_duration_days integer,
  departure_location text,
  departure_iata_code text,
  destination_iata_code text,
  flight_class text CHECK (flight_class IN ('ECONOMY', 'BUSINESS', 'FIRST')),
  travel_dates_determined boolean DEFAULT FALSE,
  booking_url text,
  itinerary jsonb,
  most_recent_api_call jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid NOT NULL REFERENCES travel_groups(group_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Travel preferences from AI conversations
  deal_breakers_and_strong_preferences text,
  interests_and_activities text,
  nice_to_haves_and_openness text,
  travel_motivations text,
  must_do_experiences text,
  learning_interests text,
  schedule_and_logistics text,
  budget_and_spending text,
  travel_style_preferences text,
  flight_preference text,
  preferences_completed_at timestamptz,
  -- Voting and confirmation
  place_votes jsonb DEFAULT '{}',
  regenerate_vote boolean DEFAULT FALSE,
  selected_hotel text,
  confirm_itinerary_vote boolean DEFAULT FALSE,
  -- Timestamps
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for travel_groups table
CREATE POLICY "Users can read groups they are members of"
  ON travel_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = travel_groups.group_id 
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create travel groups"
  ON travel_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their travel groups"
  ON travel_groups
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their travel groups"
  ON travel_groups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Policies for group_members table
CREATE POLICY "Users can read group members of groups they belong to"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own group membership"
  ON group_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_groups_host_id ON travel_groups(host_id);
CREATE INDEX IF NOT EXISTS idx_travel_groups_created_at ON travel_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_travel_groups_departure_date ON travel_groups(departure_date);
CREATE INDEX IF NOT EXISTS idx_travel_groups_travel_dates_determined ON travel_groups(travel_dates_determined);
CREATE INDEX IF NOT EXISTS idx_travel_groups_flight_class ON travel_groups(flight_class);
CREATE INDEX IF NOT EXISTS idx_travel_groups_destination_iata_code ON travel_groups(destination_iata_code);
CREATE INDEX IF NOT EXISTS idx_travel_groups_booking_url ON travel_groups(booking_url);
CREATE INDEX IF NOT EXISTS idx_travel_groups_trip_name ON travel_groups(trip_name);
CREATE INDEX IF NOT EXISTS idx_travel_groups_itinerary ON travel_groups USING GIN(itinerary);
CREATE INDEX IF NOT EXISTS idx_travel_groups_most_recent_api_call ON travel_groups USING GIN(most_recent_api_call);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_preferences_completed ON group_members(group_id, preferences_completed_at);
CREATE INDEX IF NOT EXISTS idx_group_members_incomplete_preferences ON group_members(group_id) WHERE preferences_completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_flight_preference ON group_members(group_id) WHERE flight_preference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_place_votes ON group_members USING GIN(place_votes);
CREATE INDEX IF NOT EXISTS idx_group_members_regenerate_vote ON group_members(group_id, regenerate_vote);
CREATE INDEX IF NOT EXISTS idx_group_members_confirm_itinerary_vote ON group_members(group_id, confirm_itinerary_vote);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_groups_updated_at 
  BEFORE UPDATE ON travel_groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();