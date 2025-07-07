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