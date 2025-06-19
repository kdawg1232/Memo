import * as Location from 'expo-location'
import { AppLocation, LocationPermissionStatus, LocationResponse, convertExpoLocation } from '../types/location'

export class LocationService {
  
  /**
   * Request location permissions from the user
   * @returns Promise with permission status
   */
  static async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      
      switch (status) {
        case Location.PermissionStatus.GRANTED:
          return 'granted'
        case Location.PermissionStatus.DENIED:
          return 'denied'
        default:
          return 'undetermined'
      }
    } catch (error) {
      console.error('Error requesting location permission:', error)
      return 'denied'
    }
  }

  /**
   * Check current location permission status
   * @returns Promise with current permission status
   */
  static async checkLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      
      switch (status) {
        case Location.PermissionStatus.GRANTED:
          return 'granted'
        case Location.PermissionStatus.DENIED:
          return 'denied'
        default:
          return 'undetermined'
      }
    } catch (error) {
      console.error('Error checking location permission:', error)
      return 'denied'
    }
  }

  /**
   * Get the current location of the device
   * @returns Promise with current location or error
   */
  static async getCurrentLocation(): Promise<LocationResponse> {
    try {
      // Check if we have permission first
      const permissionStatus = await this.checkLocationPermission()
      if (permissionStatus !== 'granted') {
        return {
          location: null,
          error: 'Location permission not granted'
        }
      }

      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // 5 seconds
        distanceInterval: 10, // 10 meters
      })

      return {
        location: convertExpoLocation(location),
        error: null
      }
    } catch (error) {
      console.error('Error getting current location:', error)
      return {
        location: null,
        error: error instanceof Error ? error.message : 'Failed to get location'
      }
    }
  }

  /**
   * Watch location changes (for real-time updates)
   * @param callback Function to call when location changes
   * @returns Promise with subscription object that can be removed
   */
  static async watchLocation(callback: (location: AppLocation | null, error: string | null) => void) {
    try {
      // Check if we have permission first
      const permissionStatus = await this.checkLocationPermission()
      if (permissionStatus !== 'granted') {
        callback(null, 'Location permission not granted')
        return null
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Update when moved 50 meters
        },
        (location) => {
          callback(convertExpoLocation(location), null)
        }
      )

      return subscription
    } catch (error) {
      console.error('Error watching location:', error)
      callback(null, error instanceof Error ? error.message : 'Failed to watch location')
      return null
    }
  }

  /**
   * Check if location services are enabled on the device
   * @returns Promise with boolean indicating if location is enabled
   */
  static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync()
    } catch (error) {
      console.error('Error checking if location is enabled:', error)
      return false
    }
  }

  /**
   * Get a one-time location with lower accuracy (faster)
   * @returns Promise with location or error
   */
  static async getQuickLocation(): Promise<LocationResponse> {
    try {
      const permissionStatus = await this.checkLocationPermission()
      if (permissionStatus !== 'granted') {
        return {
          location: null,
          error: 'Location permission not granted'
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      return {
        location: convertExpoLocation(location),
        error: null
      }
    } catch (error) {
      console.error('Error getting quick location:', error)
      return {
        location: null,
        error: error instanceof Error ? error.message : 'Failed to get location'
      }
    }
  }
} 