# Supabase Database Setup Guide

This guide will help you set up the Supabase database and storage for the Audio Geo-Pinning app.

## 🔧 Prerequisites
- Supabase account (sign up at [supabase.com](https://supabase.com))
- Your Supabase project URL and anon key (already added to `.env`)

## 📋 Step-by-Step Setup

### 1. Create the Database Table

1. **Open your Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Create the Pins Table**
   - Copy the contents of `database/pins_table.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the query

   This will create:
   - The `pins` table with all required columns
   - Indexes for performance optimization (using standard btree indexes)
   - Row Level Security (RLS) policies
   - Triggers for automatic timestamp updates

   **Note**: The SQL has been updated to work without requiring PostGIS extensions.

### 2. Set Up Storage Bucket

1. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click "Create bucket"

2. **Create Audio Bucket**
   - Name: `audio`
   - Make it **Public** (so audio files can be played)
   - Click "Save"

3. **Set Storage Policies**
   - Go back to SQL Editor
   - Copy the contents of `database/storage_setup.sql`
   - Paste and run the query

   This will create policies that:
   - Allow anyone to view/download audio files
   - Allow authenticated users to upload files
   - Allow users to manage only their own files

### 3. Verify Setup

1. **Check the Table**
   - Go to "Table Editor" → "pins"
   - Verify the table structure matches the schema

2. **Check Storage**
   - Go to "Storage" → "audio"
   - Verify the bucket exists and is public

3. **Test Connection**
   - Run your app: `npm start`
   - Try to sign up/sign in
   - Check for any connection errors

## 🔒 Security Features

The setup includes several security measures:

- **Row Level Security (RLS)**: Users can only modify their own pins
- **Storage Policies**: Users can only access their own audio files
- **Authentication Required**: Only signed-in users can create pins
- **Public Reading**: Anyone can view pins and listen to audio

## 📊 Database Schema

```sql
pins table:
├── id (uuid, primary key)
├── user_id (uuid, foreign key to auth.users)
├── lat (double precision, NOT NULL)
├── lng (double precision, NOT NULL) 
├── audio_url (text, NOT NULL)
├── title (text, optional)
├── description (text, optional)
├── duration (integer, seconds)
├── file_size (integer, bytes)
├── created_at (timestamp)
└── updated_at (timestamp)

audio storage bucket:
└── Structure: /user_id/timestamp.m4a
```

## 🐛 Troubleshooting

**Connection Issues:**
- Verify your `.env` file has the correct SUPABASE_URL and SUPABASE_ANON_KEY
- Check that RLS policies are enabled
- Ensure the storage bucket is public

**Permission Errors:**
- Check that authentication is working
- Verify storage policies are applied correctly
- Make sure the audio bucket has public read access

**Table Issues:**
- Verify all required columns exist
- Check that indexes are created
- Ensure RLS policies are active

## ✅ Next Steps

Once the database is set up:
1. Test authentication in the app
2. Move on to implementing map functionality
3. Add audio recording capabilities
4. Connect pin creation to the database

Your Supabase backend is now ready for the Audio Geo-Pinning app! 🚀 