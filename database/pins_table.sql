-- Create the pins table for storing audio pin locations and metadata
-- This table stores each audio memo with its GPS coordinates and metadata

CREATE TABLE IF NOT EXISTS public.pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    audio_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    duration INTEGER, -- Duration in seconds
    file_size INTEGER, -- File size in bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS pins_user_id_idx ON public.pins(user_id);
CREATE INDEX IF NOT EXISTS pins_location_idx ON public.pins(lat, lng);
CREATE INDEX IF NOT EXISTS pins_created_at_idx ON public.pins(created_at DESC);

-- Create a spatial index for location-based queries (for finding nearby pins)
-- Using a simple btree index on lat/lng for basic location queries
CREATE INDEX IF NOT EXISTS pins_lat_lng_idx ON public.pins USING btree (lat, lng);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Anyone can view pins (public feed)
CREATE POLICY "Anyone can view pins" ON public.pins
    FOR SELECT USING (true);

-- Users can insert their own pins
CREATE POLICY "Users can insert their own pins" ON public.pins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pins
CREATE POLICY "Users can update their own pins" ON public.pins
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own pins
CREATE POLICY "Users can delete their own pins" ON public.pins
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pins_updated_at BEFORE UPDATE ON public.pins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 