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