/*
  # Add date, day, month, and duration columns to itinerary_places
  Supports correct display of DateIcon and trip duration.
*/

ALTER TABLE itinerary_places
ADD COLUMN date TEXT,
ADD COLUMN day TEXT,
ADD COLUMN month TEXT,
ADD COLUMN duration INTEGER; 