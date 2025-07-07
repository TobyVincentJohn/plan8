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