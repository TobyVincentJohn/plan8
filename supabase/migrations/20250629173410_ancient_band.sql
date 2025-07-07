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