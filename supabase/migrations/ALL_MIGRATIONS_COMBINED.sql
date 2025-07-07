-- =============================
-- Migration: 20250619061542_navy_cell.sql
-- =============================
/*
  # Add travel preferences to group_members table

  1. New Columns
    - `deal_breakers_and_strong_preferences` (text) - Non-negotiable requirements and strong preferences
    - `interests_and_activities` (text) - User's interests and preferred activities
    - `nice_to_haves_and_openness` (text) - Flexible preferences and openness to new experiences
    - `travel_motivations` (text) - Reasons and motivations for travel
    - `must_do_experiences` (text) - Essential experiences the user wants
    - `learning_interests` (text) - Educational and cultural learning interests
    - `schedule_and_logistics` (text) - Timing, scheduling, and logistical preferences
    - `budget_and_spending` (text) - Budget constraints and spending preferences
    - `travel_style_preferences` (text) - Preferred travel style (luxury, adventure, comfort, etc.)
    - `preferences_completed_at` (timestamptz) - When preferences were submitted

  2. Purpose
    - Store detailed travel preferences extracted from AI conversations
    - Enable personalized itinerary generation based on group member preferences
    - Track completion status of preference collection process
*/

-- Add travel preference columns to group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS deal_breakers_and_strong_preferences TEXT,
ADD COLUMN IF NOT EXISTS interests_and_activities TEXT,
ADD COLUMN IF NOT EXISTS nice_to_haves_and_openness TEXT,
ADD COLUMN IF NOT EXISTS travel_motivations TEXT,
ADD COLUMN IF NOT EXISTS must_do_experiences TEXT,
ADD COLUMN IF NOT EXISTS learning_interests TEXT,
ADD COLUMN IF NOT EXISTS schedule_and_logistics TEXT,
ADD COLUMN IF NOT EXISTS budget_and_spending TEXT,
ADD COLUMN IF NOT EXISTS travel_style_preferences TEXT,
ADD COLUMN IF NOT EXISTS preferences_completed_at TIMESTAMPTZ;

-- Add index for querying completed preferences
CREATE INDEX IF NOT EXISTS idx_group_members_preferences_completed 
ON group_members(group_id, preferences_completed_at);

-- Add index for finding incomplete preferences
CREATE INDEX IF NOT EXISTS idx_group_members_incomplete_preferences 
ON group_members(group_id) 
WHERE preferences_completed_at IS NULL;

-- =============================
-- Migration: 20250620103714_calm_band.sql
-- =============================
/*
  # Add trip_name column and itinerary storage to travel_groups

  1. New Columns
    - `trip_name` (text) - Editable trip name, defaults to "Trip to {destination_display}"
    - `itinerary` (jsonb) - Store the generated itinerary data

  2. Purpose
    - Allow users to customize trip names
    - Store generated itinerary data for persistence
    - Enable real-time trip name updates across all users
*/

-- Add trip_name column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS trip_name TEXT,
ADD COLUMN IF NOT EXISTS itinerary JSONB;

-- Set default trip names for existing records
UPDATE travel_groups 
SET trip_name = CONCAT('Trip to ', destination_display) 
WHERE trip_name IS NULL;

-- Add index for trip name searches
CREATE INDEX IF NOT EXISTS idx_travel_groups_trip_name 
ON travel_groups(trip_name);

-- Add index for itinerary queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_itinerary 
ON travel_groups USING GIN(itinerary);

-- =============================
-- Migration: 20250625071149_silent_union.sql
-- =============================
/*
  # Add regenerate vote column to group_members table

  1. New Column
    - `regenerate_vote` (boolean) - Whether the user has voted to regenerate the itinerary

  2. Purpose
    - Track which users have voted to regenerate the itinerary
    - Enable group-based regeneration logic
*/

-- Add regenerate_vote column to group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS regenerate_vote BOOLEAN DEFAULT FALSE;

-- Add index for querying regenerate votes
CREATE INDEX IF NOT EXISTS idx_group_members_regenerate_vote 
ON group_members(group_id, regenerate_vote);

-- When inserting a new user, regenerate_vote will default to FALSE due to the DEFAULT constraint.
-- No further change needed unless you want to explicitly set it in your application logic.

-- =============================
-- Migration: 20250626144928_sparkling_scene.sql
-- =============================
/*
  # Add most_recent_api_call column to travel_groups table

  1. New Column
    - `most_recent_api_call` (jsonb) - Store the raw response from Gemini API

  2. Purpose
    - Preserve original LLM response for intelligent regeneration
    - Enable selective updates based on voting results
    - Maintain context for iterative improvements
*/

-- Add most_recent_api_call column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS most_recent_api_call JSONB;

-- Add index for API call queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_most_recent_api_call 
ON travel_groups USING GIN(most_recent_api_call);

-- =============================
-- Migration: 20250626144931_proud_lab.sql
-- =============================
/*
  # Add place voting system to group_members table

  1. New Columns
    - `place_votes` (jsonb) - Store votes for each place in the itinerary
    - `all_places_voted` (boolean) - Whether user has voted on all places
    - `regenerate_vote` (boolean) - Whether user wants to regenerate (renamed from regenerate)

  2. Purpose
    - Track individual votes for each place in the itinerary
    - Enable selective regeneration based on place-specific feedback
    - Ensure all members vote on all places before regeneration
*/

-- Add place voting columns to group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS place_votes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS all_places_voted BOOLEAN DEFAULT FALSE;

-- Rename regenerate_vote column if it exists, otherwise create it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_members' AND column_name = 'regenerate_vote') THEN
    -- Column already exists, no need to add
    NULL;
  ELSE
    ALTER TABLE group_members ADD COLUMN regenerate_vote BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add indexes for voting queries
CREATE INDEX IF NOT EXISTS idx_group_members_place_votes 
ON group_members USING GIN(place_votes);

CREATE INDEX IF NOT EXISTS idx_group_members_all_places_voted 
ON group_members(group_id, all_places_voted);

CREATE INDEX IF NOT EXISTS idx_group_members_regenerate_vote 
ON group_members(group_id, regenerate_vote);

-- =============================
-- Migration: 20250629090406_bitter_island.sql
-- =============================
/*
  # Add flight_preference column to group_members table

  1. New Column
    - `flight_preference` (text) - User's flight preferences and requirements

  2. Purpose
    - Store flight-specific preferences from ElevenLabs webhook
    - Enable flight recommendations based on user preferences
*/

-- Add flight_preference column to group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS flight_preference TEXT;

-- Add index for flight preference queries
CREATE INDEX IF NOT EXISTS idx_group_members_flight_preference 
ON group_members(group_id) 
WHERE flight_preference IS NOT NULL;

-- =============================
-- Migration: 20250629094513_falling_spire.sql
-- =============================
/*
  # Add travel dates and flight information to travel_groups table

  1. New Columns
    - `departure_date` (date) - Calculated departure date
    - `return_date` (date) - Calculated return date
    - `trip_duration_days` (integer) - Number of days for the trip
    - `departure_location` (text) - Departure city/airport
    - `departure_iata_code` (text) - IATA code for departure airport
    - `flight_class` (text) - Determined flight class (ECONOMY, BUSINESS, FIRST)
    - `travel_dates_determined` (boolean) - Whether dates have been calculated
    - `majority_departure_location` (text) - Location where majority are departing from

  2. Purpose
    - Store calculated travel dates based on group schedules
    - Store flight class preference based on group consensus
    - Store departure information for booking links
    - Track whether travel dates have been determined
*/

-- Add travel dates and flight information columns to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS departure_date DATE,
ADD COLUMN IF NOT EXISTS return_date DATE,
ADD COLUMN IF NOT EXISTS trip_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS departure_location TEXT,
ADD COLUMN IF NOT EXISTS departure_iata_code TEXT,
ADD COLUMN IF NOT EXISTS flight_class TEXT CHECK (flight_class IN ('ECONOMY', 'BUSINESS', 'FIRST')),
ADD COLUMN IF NOT EXISTS travel_dates_determined BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS majority_departure_location TEXT;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_travel_groups_departure_date 
ON travel_groups(departure_date);

CREATE INDEX IF NOT EXISTS idx_travel_groups_travel_dates_determined 
ON travel_groups(travel_dates_determined);

CREATE INDEX IF NOT EXISTS idx_travel_groups_flight_class 
ON travel_groups(flight_class);

-- =============================
-- Migration: 20250629094836_red_bonus.sql
-- =============================
/*
  # Add destination IATA code to travel_groups table

  1. New Column
    - `destination_iata_code` (text) - IATA airport code for the destination

  2. Purpose
    - Store destination airport code for flight booking links
    - Enable automatic generation of booking URLs
    - Complement the existing departure IATA code
*/

-- Add destination_iata_code column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS destination_iata_code TEXT;

-- Add index for destination IATA code queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_destination_iata_code 
ON travel_groups(destination_iata_code);

-- =============================
-- Migration: 20250629101635_round_palace.sql
-- =============================
/*
  # Remove redundant majority_departure_location column

  1. Changes
    - Remove `majority_departure_location` column from travel_groups table
    - The `departure_location` field already contains the location most people are departing from

  2. Reasoning
    - Eliminates data redundancy
    - Simplifies the data model
    - `departure_location` already represents the majority/chosen departure location
*/

-- Remove the redundant majority_departure_location column
ALTER TABLE travel_groups 
DROP COLUMN IF EXISTS majority_departure_location;

-- =============================
-- Migration: 20250629101903_wooden_villa.sql
-- =============================
/*
  # Add booking_url column to travel_groups table

  1. New Column
    - `booking_url` (text) - Store the generated Booking.com URL

  2. Purpose
    - Store the complete Booking.com URL for flight booking
    - Enable direct booking functionality from the travel plan
*/

-- Add booking_url column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Add index for booking URL queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_booking_url 
ON travel_groups(booking_url);

-- =============================
-- Migration: 20250629173410_ancient_band.sql
-- =============================
/*
  # Add confirm_itinerary_vote column to group_members table

  1. New Column
    - `confirm_itinerary_vote` (boolean) - Whether the user has confirmed the itinerary

  2. Purpose
    - Track which users have confirmed the final itinerary
    - Enable group-based confirmation logic before booking
*/

-- Add confirm_itinerary_vote column to group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS confirm_itinerary_vote BOOLEAN DEFAULT FALSE;

-- Add index for querying confirmation votes
CREATE INDEX IF NOT EXISTS idx_group_members_confirm_itinerary_vote 
ON group_members(group_id, confirm_itinerary_vote);

-- =============================
-- Migration: 20250629184743_muddy_waterfall.sql
-- =============================
/*
  # Complete Database Schema for Plan8 Travel Planning Application

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

-- =============================
-- Migration: 20250630114439_proud_desert.sql
-- =============================
/*
  # Add gender column to profiles table

  1. New Column
    - `gender` (text) - User's gender for flight booking requirements

  2. Purpose
    - Store gender information required for flight booking API
    - Enable passenger data collection for booking process
*/

-- Add gender column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add index for gender queries
CREATE INDEX IF NOT EXISTS idx_profiles_gender 
ON profiles(gender);

-- =============================
-- Migration: 20250630114502_crystal_coast.sql
-- =============================
/*
  # Add selected_flight column to travel_groups table

  1. New Column
    - `selected_flight` (jsonb) - Store the selected flight data from itinerary generation

  2. Purpose
    - Store selected flight information for booking process
    - Enable flight booking with specific flight option index
*/

-- Add selected_flight column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS selected_flight JSONB;

-- Add index for selected flight queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_selected_flight 
ON travel_groups USING GIN(selected_flight);

-- =============================
-- Migration: 20250630170323_turquoise_harbor.sql
-- =============================
/*
  # Add itinerary_feedback column to group_members table

  1. New Column
    - `itinerary_feedback` (text) - Store user feedback for itinerary regeneration

  2. Purpose
    - Store user feedback about what they liked and what they want changed
    - Enable feedback-based itinerary regeneration instead of voting system
*/

-- Add itinerary_feedback column to group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS itinerary_feedback TEXT;

-- Add index for feedback queries
CREATE INDEX IF NOT EXISTS idx_group_members_itinerary_feedback 
ON group_members(group_id) 
WHERE itinerary_feedback IS NOT NULL; 