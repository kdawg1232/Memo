import { LocationObject } from 'expo-location'

// Location types for the app
export interface AppLocation {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  heading?: number
  speed?: number
}

// Map region type for react-native-maps
export interface MapRegion {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

// Custom marker type for map pins
export interface MapMarker {
  id: string
  coordinate: {
    latitude: number
    longitude: number
  }
  title?: string
  description?: string
  audio_url?: string
  user_id?: string
  created_at?: string
}

// Location permission status
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined'

// Location service response
export interface LocationResponse {
  location: AppLocation | null
  error: string | null
}

// Convert Expo location to our app location format
export const convertExpoLocation = (location: LocationObject): AppLocation => ({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  accuracy: location.coords.accuracy || undefined,
  altitude: location.coords.altitude || undefined,
  heading: location.coords.heading || undefined,
  speed: location.coords.speed || undefined,
})

// Default map deltas for zoom level
export const DEFAULT_LATITUDE_DELTA = 0.0922
export const DEFAULT_LONGITUDE_DELTA = 0.0421 