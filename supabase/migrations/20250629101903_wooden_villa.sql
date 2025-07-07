/*
  # Add booking_url column to travel_groups table

  1. New Column
    - `booking_url` (text) - Store the generated Booking.com URL

  2. Purpose
    - Store the complete Booking.com URL for flight booking
    - Enable direct booking functionality from the travel plan
*/

-- Add booking_url column to travel_groups table
ALTER TABLE travel_groups 
ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Add index for booking URL queries
CREATE INDEX IF NOT EXISTS idx_travel_groups_booking_url 
ON travel_groups(booking_url);