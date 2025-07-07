/*
  # Remove redundant majority_departure_location column

  1. Changes
    - Remove `majority_departure_location` column from travel_groups table
    - The `departure_location` field already contains the location most people are departing from

  2. Reasoning
    - Eliminates data redundancy
    - Simplifies the data model
    - `departure_location` already represents the majority/chosen departure location
*/

-- Remove the redundant majority_departure_location column
ALTER TABLE travel_groups 
DROP COLUMN IF EXISTS majority_departure_location;