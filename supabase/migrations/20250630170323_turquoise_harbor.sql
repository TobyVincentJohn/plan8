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