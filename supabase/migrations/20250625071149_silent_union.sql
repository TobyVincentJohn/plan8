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