-- Create storage bucket for audio files
-- This will store the actual audio recordings referenced by the pins table

-- Insert the audio bucket (this needs to be done via Supabase dashboard or REST API)
-- Storage buckets are created through the Supabase interface, not SQL
-- But we can set up the policies here

-- Storage policies for the 'audio' bucket
-- These policies control who can upload, view, and delete audio files

-- Policy: Anyone can view/download audio files (public listening)
CREATE POLICY "Anyone can view audio files" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio');

-- Policy: Authenticated users can upload audio files
CREATE POLICY "Authenticated users can upload audio" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can update their own audio files
CREATE POLICY "Users can update their own audio files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'audio' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Users can delete their own audio files  
CREATE POLICY "Users can delete their own audio files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Note: The actual bucket creation must be done through the Supabase dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "Create bucket"  
-- 3. Name it "audio"
-- 4. Make it public if you want audio files to be publicly accessible
-- 5. The policies above will then be applied 