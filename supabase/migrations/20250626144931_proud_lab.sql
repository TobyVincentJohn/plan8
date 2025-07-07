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