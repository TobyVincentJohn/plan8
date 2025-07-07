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