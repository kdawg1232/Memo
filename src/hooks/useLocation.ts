import { useState, useEffect, useRef } from 'react'
import { LocationSubscription } from 'expo-location'
import { LocationService } from '../services/location'
import { AppLocation, LocationPermissionStatus } from '../types/location'

interface UseLocationState {
  location: AppLocation | null
  loading: boolean
  error: string | null
  permissionStatus: LocationPermissionStatus
  isLocationEnabled: boolean
}

interface UseLocationReturn extends UseLocationState {
  requestPermission: () => Promise<void>
  getCurrentLocation: () => Promise<void>
  startWatching: () => Promise<void>
  stopWatching: () => void
  refreshLocation: () => Promise<void>
}

export function useLocation(): UseLocationReturn {
  const [state, setState] = useState<UseLocationState>({
    location: null,
    loading: false,
    error: null,
    permissionStatus: 'undetermined',
    isLocationEnabled: false,
  })

  // Keep track of location watching subscription
  const watchSubscription = useRef<LocationSubscription | null>(null)

  // Check initial permission status and location services
  useEffect(() => {
    const checkInitialStatus = async () => {
      const permissionStatus = await LocationService.checkLocationPermission()
      const isLocationEnabled = await LocationService.isLocationEnabled()
      
      setState(prev => ({
        ...prev,
        permissionStatus,
        isLocationEnabled,
      }))

      // If we have permission, get initial location
      if (permissionStatus === 'granted' && isLocationEnabled) {
        await getCurrentLocation()
      }
    }

    checkInitialStatus()
  }, [])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      stopWatching()
    }
  }, [])

  /**
   * Request location permission from user
   */
  const requestPermission = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const permissionStatus = await LocationService.requestLocationPermission()
      const isLocationEnabled = await LocationService.isLocationEnabled()

      setState(prev => ({
        ...prev,
        permissionStatus,
        isLocationEnabled,
        loading: false,
      }))

      if (permissionStatus === 'granted' && isLocationEnabled) {
        await getCurrentLocation()
      } else if (permissionStatus === 'denied') {
        setState(prev => ({
          ...prev,
          error: 'Location permission denied. Please enable in device settings.',
        }))
      } else if (!isLocationEnabled) {
        setState(prev => ({
          ...prev,
          error: 'Location services are disabled. Please enable in device settings.',
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to request location permission',
      }))
    }
  }

  /**
   * Get current location once
   */
  const getCurrentLocation = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await LocationService.getCurrentLocation()
      
      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }))
      } else {
        setState(prev => ({
          ...prev,
          location: result.location,
          loading: false,
          error: null,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to get current location',
      }))
    }
  }

  /**
   * Start watching location changes
   */
  const startWatching = async (): Promise<void> => {
    // Stop existing subscription if any
    stopWatching()

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const subscription = await LocationService.watchLocation((location, error) => {
        if (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error,
          }))
        } else {
          setState(prev => ({
            ...prev,
            location,
            loading: false,
            error: null,
          }))
        }
      })

      watchSubscription.current = subscription
      
      if (!subscription) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to start location watching',
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to start location watching',
      }))
    }
  }

  /**
   * Stop watching location changes
   */
  const stopWatching = (): void => {
    if (watchSubscription.current) {
      watchSubscription.current.remove()
      watchSubscription.current = null
    }
  }

  /**
   * Refresh current location (quick update)
   */
  const refreshLocation = async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await LocationService.getQuickLocation()
      
      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }))
      } else {
        setState(prev => ({
          ...prev,
          location: result.location,
          loading: false,
          error: null,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to refresh location',
      }))
    }
  }

  return {
    ...state,
    requestPermission,
    getCurrentLocation,
    startWatching,
    stopWatching,
    refreshLocation,
  }
} 