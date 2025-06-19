# TASKS.md

## ✅ DAY 1 TASKS — Audio Geo-Pinning MVP (24hr sprint)

### 🔧 SETUP (0–2 hrs) ✅ COMPLETE
- [x] Create a new Expo project with TypeScript (converted from JS template)
- [x] Install the following dependencies:
  - [x] `react-native-maps` for map view
  - [x] `expo-av` for recording and playing audio
  - [x] `expo-location` for getting device GPS
  - [x] `@supabase/supabase-js` for backend integration
  - [x] `@react-native-async-storage/async-storage` for auth storage
- [x] Create Supabase project and initialize configuration
- [x] Create comprehensive Supabase table `pins` with columns:
  - `id: uuid, primary key`
  - `user_id: uuid (references auth.users)`
  - `lat: double precision`
  - `lng: double precision`
  - `audio_url: text`
  - `title: text (optional)`
  - `description: text (optional)`
  - `duration: integer (seconds)`
  - `file_size: integer (bytes)`
  - `created_at: timestamp`
  - `updated_at: timestamp`
- [x] Create public Supabase Storage bucket called `audio`
- [x] Set up Row Level Security (RLS) policies
- [x] Configure app permissions for iOS and Android
- [x] Create TypeScript types for all data structures
- [x] Set up complete authentication system

---

### 🌍 MAP + LOCATION (2–6 hrs) ✅ COMPLETE
- [x] Ask for location permissions using `Location.requestForegroundPermissionsAsync()`
- [x] Use `Location.getCurrentPositionAsync()` to get current GPS coordinates
- [x] Set up `react-native-maps` with a `MapView` centered at the current location
- [x] Render a marker on the map at the user's current location
- [x] Style the map to use full screen view and update position if the user moves
- [x] Create comprehensive LocationService for GPS handling
- [x] Create useLocation hook for state management
- [x] Handle location permission denied/undetermined states
- [x] Add location watching with real-time updates
- [x] Add user-friendly permission request screens
- [x] Implement map controls (location button, follow user)
- [x] Add location accuracy display and error handling

---

### 🎤 AUDIO RECORDING (6–8 hrs) 🔄 CURRENT FOCUS
- [x] Create TypeScript types for audio recording and playback
- [x] Configure microphone permissions in app.json
- [ ] Ask for microphone permissions using `Audio.requestPermissionsAsync()` (🔄 NEXT)
- [ ] Initialize audio recording with `Audio.Recording` instance (🔄 NEXT)
- [ ] Implement start recording button: call `prepareToRecordAsync()` and `startAsync()` (🔄 NEXT)
- [ ] Implement stop recording button: call `stopAndUnloadAsync()` and retrieve file URI (🔄 NEXT)
- [ ] Add simple UI buttons for Record / Stop / Play (🔄 NEXT)
- [ ] Add basic audio playback functionality using `Audio.Sound` (🔄 NEXT)

---

### 📡 SUPABASE BACKEND (8–12 hrs) ✅ COMPLETE
- [x] Set up Supabase client with project `url` and `anon key`
- [x] Implement email/password sign-up and sign-in using `supabase.auth.signUp()` and `signInWithPassword()`
- [x] Create DatabaseService with full CRUD operations for pins
- [x] Set up storage policies for secure file access
- [x] Create TypeScript interfaces for all database operations
- [x] Implement nearby pins query functionality
- [x] Add comprehensive error handling and type safety
- [ ] Upload the recorded audio file to Supabase storage under path `user_id/timestamp.m4a` (🔄 NEXT)
- [ ] Get a public URL of the uploaded file (🔄 NEXT)
- [ ] Save a new row in `pins` table with `user_id`, `lat`, `lng`, `audio_url`, and `created_at` (🔄 NEXT)

---

### 🗺️ PIN LOGIC (12–16 hrs)
- [ ] On recording complete + upload, drop a marker on the map at the user's current location
- [ ] Fetch all pins from Supabase where `distance(lat, lng) < 1km` from current user
- [ ] Add markers to the map for each nearby pin
- [ ] When marker is tapped, retrieve the audio URL and stream it using `Audio.Sound.createAsync`
- [ ] Add visual feedback to show loading/spinner when playing audio

---

### 🧪 POLISH + BUG FIXES (16–22 hrs)
- [ ] Handle case: user denies location or mic permission (show message or fallback)
- [ ] Handle login failures or missing user sessions
- [ ] Prevent uploading empty recordings
- [ ] Avoid dropping multiple pins on the same location repeatedly
- [ ] Show toast or alert on successful upload or failure
- [ ] Validate file formats and length (max 30s recording, for example)

---

### 🚀 FINAL DEPLOYMENT (22–24 hrs)
- [ ] Push final code to GitHub repo
- [ ] Test app on Android physical device (via Expo Go)
- [ ] Test app on iOS simulator or device (via Expo Go)
- [ ] Record screen demo of usage (record, pin, play)
- [ ] Write README with:
  - What the app does
  - How to run it
  - Screenshots or demo link

---

## 📊 Progress Summary
**Completed: 3/7 major phases** 🎯

- **Setup & Dependencies**: ✅ Complete 
- **Map & Location**: ✅ Complete  
- **Audio Recording**: 🔄 In Progress (Next)
- **Supabase Integration**: 🔄 In Progress (File upload pending)
- **Pin Logic**: ⏳ Planned
- **Polish & Bug Fixes**: ⏳ Planned
- **Deployment**: ⏳ Planned

## 🎯 Current Status
**Ready for Audio Recording Implementation!** 

We have a solid foundation:
- ✅ Full TypeScript Expo project
- ✅ Complete authentication system
- ✅ Database schema with RLS policies
- ✅ Interactive map with user location
- ✅ Location services and permissions

**Next milestone**: Build audio recording functionality and connect it to the record button on the map! 🎤 

---

## 📝 Discovered During Work
### 🎨 UI/UX Improvements
- [x] **Create Landing Page** (2024-12-26): Build a beautiful landing screen with app logo, feature highlights, and navigation to auth - similar to "Locked In" design but themed for Memo app ✅ COMPLETE
- [x] **Bottom Navigation Implementation** (2024-12-26): Added Instagram/Snapchat-style bottom navigation with Friends, Map, and Profile screens with emoji icons ✅ COMPLETE