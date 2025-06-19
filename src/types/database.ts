// Database types for Supabase schema
// These types ensure type safety when working with the database

export interface Pin {
  id: string
  user_id: string
  lat: number
  lng: number
  audio_url: string
  title?: string
  description?: string
  duration?: number  // Duration in seconds
  file_size?: number // File size in bytes
  created_at: string
  updated_at: string
}

// Type for creating a new pin (without auto-generated fields)
export interface CreatePin {
  user_id: string
  lat: number
  lng: number
  audio_url: string
  title?: string
  description?: string
  duration?: number
  file_size?: number
}

// Type for updating a pin (all fields optional except id)
export interface UpdatePin {
  id: string
  title?: string
  description?: string
  duration?: number
  file_size?: number
}

// Location type for GPS coordinates
export interface Location {
  lat: number
  lng: number
}

// Audio file metadata
export interface AudioMetadata {
  duration: number
  file_size: number
  format: string
  url: string
}

// Database response types
export interface DatabaseResponse<T> {
  data: T | null
  error: Error | null
}

// Query filters for finding nearby pins
export interface NearbyPinsQuery {
  lat: number
  lng: number
  radius: number // radius in meters
  limit?: number
} 