/*
  # Add main_image column to travel_groups table
  Stores the main image URL for the trip.
*/

ALTER TABLE travel_groups
ADD COLUMN main_image TEXT; 