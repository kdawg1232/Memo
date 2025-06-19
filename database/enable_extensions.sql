-- Optional: Enable PostGIS extensions for advanced spatial queries
-- Run this ONLY if you want advanced geographic search capabilities
-- Note: This requires elevated permissions and may not be available on all Supabase plans

-- Enable PostGIS extension (provides advanced geographic functions)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable earthdistance extension (provides earth distance calculations)  
-- CREATE EXTENSION IF NOT EXISTS earthdistance;

-- If you enable these extensions, you can replace the simple lat/lng index with:
-- CREATE INDEX IF NOT EXISTS pins_location_spatial_idx ON public.pins USING gist (
--     ll_to_earth(lat, lng)
-- );

-- For now, we're using the simpler approach that works with basic Supabase setup 