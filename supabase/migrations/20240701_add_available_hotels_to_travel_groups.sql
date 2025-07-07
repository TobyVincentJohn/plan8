/*
  # Add available_hotels column to travel_groups table
  Stores the list of hotel options for the itinerary as JSONB.
*/

ALTER TABLE travel_groups
ADD COLUMN available_hotels JSONB; 