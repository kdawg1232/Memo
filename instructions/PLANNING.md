# Planning.md

## 🧭 Project Overview
**Audio Geo-Pinning** is a location-based voice journaling app that lets users drop short audio memos at specific physical locations on a map. These memos are viewable and listenable by anyone who visits that spot virtually. It’s like geocaching meets podcasting — leave your thoughts, stories, or tips where they matter most.

## 🎯 MVP Goals (24-Hour Build)
Build a minimum viable version that supports:
- Recording audio
- Pinning that audio to a live GPS location
- Viewing pins on a map
- Playing back audio from any pin
- Simple user authentication

## 📲 Key Features
| Feature                | Description |
|------------------------|-------------|
| **Record Audio**       | Users can record short voice messages via their phone mic |
| **Pin to Location**    | After recording, the audio is geo-pinned to the user’s current GPS location |
| **Map View**           | Shows user location and nearby audio pins |
| **Playback Pins**      | Users can tap pins and play audio in-app |
| **User Auth**          | Auth via email  |

## 🛠 Tech Stack
| Layer       | Tool |
|-------------|------|
| Frontend    | React Native (Expo) |
| Maps        | `react-native-maps` |
| Audio       | `expo-av` |
| GPS         | `expo-location` |
| Backend     | Supabase (DB + Auth + Storage) |
| Hosting     | GitHub + Expo Go |

## 🗄 Supabase Schema
### Table: `pins`
| Field      | Type     | Description                  |
|------------|----------|------------------------------|
| id         | uuid     | Primary key                  |
| user_id    | uuid     | Foreign key to auth.users    |
| lat        | float    | Latitude of pin              |
| lng        | float    | Longitude of pin             |
| audio_url  | text     | Link to audio file in storage|
| created_at | timestamp| Time pin was created         |

### Storage
- Bucket: `audio`
- Path: `/user_id/timestamp.m4a`

## ⏱ 24-Hour Timeline
| Time         | Focus                        |
|--------------|------------------------------|
| 0–2 hrs      | Project setup, install deps  |
| 2–6 hrs      | Map + GPS integration        |
| 6–8 hrs      | Audio recording UI + logic   |
| 8–12 hrs     | Supabase integration         |
| 12–16 hrs    | Pin logic + map markers      |
| 16–22 hrs    | Polish + bug handling        |
| 22–24 hrs    | Test + record demo + README  |

## 🔚 Success Criteria
By the end of 24 hours, the user should be able to:
- Open the app, see their location on a map
- Record and upload a voice memo
- See a pin dropped where they recorded it
- Tap the pin to hear the audio
- View other pins within a short distance
- Sign in 

Let me know if you’d like to extend this to v2 features like comments, privacy controls, pin filtering, or social discovery.
