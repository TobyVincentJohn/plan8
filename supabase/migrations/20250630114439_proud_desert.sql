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