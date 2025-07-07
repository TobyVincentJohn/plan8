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