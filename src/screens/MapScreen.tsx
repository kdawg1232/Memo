import React, { useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps'
import { useLocation } from '../hooks/useLocation'
import { useAuth } from '../hooks/useAuth'
import { MapRegion, DEFAULT_LATITUDE_DELTA, DEFAULT_LONGITUDE_DELTA } from '../types/location'

const MapScreen: React.FC = () => {
  const { user, signOut } = useAuth()
  const {
    location,
    loading,
    error,
    permissionStatus,
    isLocationEnabled,
    requestPermission,
    getCurrentLocation,
    refreshLocation,
  } = useLocation()

  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null)
  const [followUserLocation, setFollowUserLocation] = useState<boolean>(true)

  // Update map region when location changes
  useEffect(() => {
    if (location && followUserLocation) {
      const region: MapRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: DEFAULT_LATITUDE_DELTA,
        longitudeDelta: DEFAULT_LONGITUDE_DELTA,
      }
      setMapRegion(region)
    }
  }, [location, followUserLocation])

  // Handle permission request
  const handleRequestPermission = async () => {
    await requestPermission()
  }

  // Handle location refresh
  const handleRefreshLocation = async () => {
    await refreshLocation()
  }

  // Handle user location button press
  const handleGoToUserLocation = async () => {
    if (location) {
      const region: MapRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: DEFAULT_LATITUDE_DELTA,
        longitudeDelta: DEFAULT_LONGITUDE_DELTA,
      }
      setMapRegion(region)
      setFollowUserLocation(true)
    } else {
      await getCurrentLocation()
    }
  }

  // Handle map region change (stop following user when map is moved manually)
  const handleRegionChangeComplete = (region: Region) => {
    setFollowUserLocation(false)
  }

  // Handle sign out
  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      Alert.alert('Error', error.message)
    }
  }

  // Show permission request if needed
  if (permissionStatus === 'denied') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Location permission is required</Text>
        <Text style={styles.descriptionText}>
          This app needs location access to show your position and let you pin audio recordings to specific places.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
          <Text style={styles.buttonText}>Grant Location Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!isLocationEnabled) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Location services are disabled</Text>
        <Text style={styles.descriptionText}>
          Please enable location services in your device settings to use this app.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleRefreshLocation}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (permissionStatus === 'undetermined') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.titleText}>Welcome to Audio Geo-Pinning!</Text>
        <Text style={styles.descriptionText}>
          This app lets you record and pin audio messages to specific locations on the map.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Audio Geo-Pinning</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
            <Text style={styles.headerButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT} // Use Apple Maps - FREE forever!
          style={styles.map}
          region={mapRegion || {
            latitude: 37.78825, // Default to San Francisco
            longitude: -122.4324,
            latitudeDelta: DEFAULT_LATITUDE_DELTA,
            longitudeDelta: DEFAULT_LONGITUDE_DELTA,
          }}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          mapType="standard" // Options: standard, satellite, hybrid, mutedStandard
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
        >
          {/* User location marker (custom) */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Your Location"
              description={`Accuracy: ${location.accuracy?.toFixed(0)}m`}
              pinColor="blue"
            />
          )}
        </MapView>

        {/* Error overlay */}
        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorOverlayText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefreshLocation}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={[styles.locationButton, followUserLocation && styles.locationButtonActive]} 
          onPress={handleGoToUserLocation}
        >
          <Text style={styles.locationButtonText}>📍</Text>
        </TouchableOpacity>
        
        {/* Record button placeholder */}
        <TouchableOpacity style={styles.recordButton}>
          <Text style={styles.recordButtonText}>🎤</Text>
        </TouchableOpacity>
      </View>

      {/* Location info */}
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationInfoText}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
          {location.accuracy && (
            <Text style={styles.accuracyText}>
              Accuracy: {location.accuracy.toFixed(0)}m
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  mapPlaceholderTitle: {
    fontSize: 32,
    marginBottom: 10,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  locationDisplay: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  locationCoords: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#007AFF',
    marginBottom: 2,
  },
  getLocationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  getLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorOverlayText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
  },
  locationButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationButtonActive: {
    backgroundColor: '#007AFF',
  },
  locationButtonText: {
    fontSize: 20,
  },
  recordButton: {
    width: 70,
    height: 70,
    backgroundColor: '#FF3B30',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recordButtonText: {
    fontSize: 30,
  },
  locationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 6,
  },
  locationInfoText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  accuracyText: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#FF3B30',
  },
  descriptionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default MapScreen 