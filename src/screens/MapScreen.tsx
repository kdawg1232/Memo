import React, { useEffect, useState, useRef } from 'react'
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
import { MapRegion, DEFAULT_LATITUDE_DELTA, DEFAULT_LONGITUDE_DELTA } from '../types/location'
import { AudioIcon } from '../components/Icons'
import VoiceRecordingModal from '../components/VoiceRecordingModal'
import AudioPlaybackModal from '../components/AudioPlaybackModal'
import { 
  createAudioPin, 
  fetchAudioPins, 
  deleteAudioPin,
  AudioPin, 
  CreateAudioPinData 
} from '../services/database'

interface MapScreenProps {
  shouldCenterOnUser?: boolean
  onCenterCompleted?: () => void
}

const MapScreen: React.FC<MapScreenProps> = ({ 
  shouldCenterOnUser = false, 
  onCenterCompleted 
}) => {
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
  const [isRecordingModalVisible, setIsRecordingModalVisible] = useState<boolean>(false)
  const [isPlaybackModalVisible, setIsPlaybackModalVisible] = useState<boolean>(false)
  const [selectedPin, setSelectedPin] = useState<AudioPin | null>(null)
  const [audioPins, setAudioPins] = useState<AudioPin[]>([])
  const [isLoadingPins, setIsLoadingPins] = useState<boolean>(false)
  const [isCreatingPin, setIsCreatingPin] = useState<boolean>(false)
  const mapViewRef = useRef<MapView>(null)



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

  // Load audio pins when component mounts or location changes
  useEffect(() => {
    loadAudioPins()
  }, [location])

  // Reload pins when modal closes (in case new pins were added elsewhere)
  useEffect(() => {
    if (!isRecordingModalVisible && !isPlaybackModalVisible) {
      loadAudioPins()
    }
  }, [isRecordingModalVisible, isPlaybackModalVisible])

  // Debug: Log when audioPins state changes
  useEffect(() => {
    console.log('🔄 AudioPins state updated. Count:', audioPins.length)
    audioPins.forEach((pin, index) => {
      console.log(`🟠 Pin ${index}: ID=${pin.id}, lat=${pin.lat}, lng=${pin.lng}`)
    })
  }, [audioPins])

  // Load audio pins from database
  const loadAudioPins = async () => {
    try {
      setIsLoadingPins(true)
      console.log('🔄 Loading audio pins from database...')
      
      // Fetch pins with optional location bounds for better performance
      let bounds = undefined
      if (mapRegion) {
        bounds = {
          northEast: {
            lat: mapRegion.latitude + mapRegion.latitudeDelta / 2,
            lng: mapRegion.longitude + mapRegion.longitudeDelta / 2,
          },
          southWest: {
            lat: mapRegion.latitude - mapRegion.latitudeDelta / 2,
            lng: mapRegion.longitude - mapRegion.longitudeDelta / 2,
          },
        }
      }

      const result = await fetchAudioPins(bounds)
      
      if (result.success && result.pins) {
        console.log('✅ Loaded', result.pins.length, 'audio pins')
        setAudioPins(result.pins)
      } else {
        console.error('❌ Failed to load pins:', result.error)
      }
    } catch (error) {
      console.error('❌ Error loading pins:', error)
    } finally {
      setIsLoadingPins(false)
    }
  }

  // Handle centering on user when requested from navigation
  useEffect(() => {
    if (shouldCenterOnUser && location) {
      console.log('🗺️ Navigation map button pressed - centering on user location')
      // Center map on user location when map button is pressed
      handleGoToUserLocation()
      // Notify parent that centering is complete
      onCenterCompleted?.()
    }
  }, [shouldCenterOnUser, location, onCenterCompleted])

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
      console.log('📍 Centering map on user location:', location.latitude, location.longitude)
      const region: MapRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: DEFAULT_LATITUDE_DELTA,
        longitudeDelta: DEFAULT_LONGITUDE_DELTA,
      }
      
      // Use animateToRegion for smooth animation to user location
      if (mapViewRef.current) {
        console.log('🎯 Animating to region:', region)
        mapViewRef.current.animateToRegion(region, 1000) // 1 second animation
      } else {
        console.log('❌ MapView ref is null')
      }
      
      setMapRegion(region)
      setFollowUserLocation(true)
    } else {
      console.log('❌ No location available, getting current location...')
      await getCurrentLocation()
    }
  }

  // Handle map region change (stop following user when map is moved manually)
  const handleRegionChangeComplete = (region: Region) => {
    setFollowUserLocation(false)
  }

  // Handle record button press
  const handleRecordButtonPress = () => {
    console.log('🎤 Record button pressed - opening recording modal')
    setIsRecordingModalVisible(true)
  }

  // Handle recording modal close
  const handleRecordingModalClose = () => {
    console.log('❌ Recording modal closed')
    setIsRecordingModalVisible(false)
  }

  // Handle recording send (create audio pin)
  const handleRecordingSend = async (audioUri: string) => {
    if (!location) {
      Alert.alert('Location Error', 'Unable to get your current location. Please try again.')
      return
    }

    try {
      setIsCreatingPin(true)
      console.log('📤 Recording sent - creating audio pin:', audioUri)
      console.log('📍 Current location for pin:', location.latitude, location.longitude)

      // Get file info for better pin metadata
      const response = await fetch(audioUri)
      const blob = await response.blob()
      
      console.log('📄 Pre-upload file info:')
      console.log('  - URI:', audioUri)
      console.log('  - Size:', blob.size, 'bytes')
      console.log('  - Type:', blob.type)
      
      if (blob.size === 0) {
        console.error('❌ Cannot upload empty audio file!')
        Alert.alert('Recording Error', 'The audio file is empty. Please try recording again.')
        return
      }
      
      // Create pin data with current location and file info
      const pinData: CreateAudioPinData = {
        lat: location.latitude,
        lng: location.longitude,
        title: `Voice Memo`,
        description: `Recorded at ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        file_size: blob.size,
        // Note: duration will be extracted during upload if possible
      }

      // Create the audio pin (uploads audio and creates database record)
      const result = await createAudioPin(audioUri, pinData)

      if (result.success && result.pin) {
        console.log('✅ Audio pin created successfully:', result.pin.id)
        console.log('📍 Pin coordinates:', result.pin.lat, result.pin.lng)
        console.log('🔢 Current pins count:', audioPins.length)
        
        // Add the new pin to our local state
        setAudioPins(prevPins => {
          const newPins = [result.pin!, ...prevPins]
          console.log('🔢 New pins count:', newPins.length)
          console.log('📌 All pins:', newPins.map(p => ({ id: p.id, lat: p.lat, lng: p.lng })))
          return newPins
        })
        
        // Show success message
        Alert.alert('Success', 'Your audio pin has been created!', [
          { text: 'OK', onPress: () => console.log('Pin creation confirmed') }
        ])
        
        setIsRecordingModalVisible(false)
      } else {
        console.error('❌ Failed to create pin:', result.error)
        Alert.alert('Upload Failed', result.error || 'Unable to create audio pin. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error creating pin:', error)
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsCreatingPin(false)
    }
  }

  // Handle pin marker press (open playback modal)
  const handlePinPress = (pin: AudioPin) => {
    console.log('🎵 Pin pressed - opening playback modal:', pin.id)
    setSelectedPin(pin)
    setIsPlaybackModalVisible(true)
  }

  // Handle playback modal close
  const handlePlaybackModalClose = () => {
    console.log('❌ Playback modal closed')
    setSelectedPin(null)
    setIsPlaybackModalVisible(false)
  }

  // Handle pin deletion
  const handlePinDelete = async (pinId: string) => {
    try {
      console.log('🗑️ Deleting audio pin:', pinId)
      
      const result = await deleteAudioPin(pinId)
      
      if (result.success) {
        console.log('✅ Pin deleted successfully')
        
        // Remove the pin from local state
        setAudioPins(prevPins => prevPins.filter(pin => pin.id !== pinId))
        
        Alert.alert('Success', 'Audio pin deleted successfully!', [
          { text: 'OK', onPress: () => console.log('Pin deletion confirmed') }
        ])
      } else {
        console.error('❌ Failed to delete pin:', result.error)
        Alert.alert('Delete Failed', result.error || 'Unable to delete audio pin. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error deleting pin:', error)
      Alert.alert('Error', 'An unexpected error occurred while deleting the pin.')
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
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapViewRef}
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
          {/* Audio pin markers */}
          {audioPins.map((pin, index) => {
            if (index === 0) console.log('🗺️ Rendering', audioPins.length, 'audio pins on map')
            console.log(`🟠 Pin ${index + 1}:`, pin.id, 'at', pin.lat, pin.lng, 'created:', new Date(pin.created_at).toLocaleTimeString())
            return (
              <Marker
                key={pin.id}
                coordinate={{
                  latitude: pin.lat,
                  longitude: pin.lng,
                }}
                title={pin.title || `Voice Memo ${index + 1}`}
                description={`Tap to play • ${new Date(pin.created_at).toLocaleDateString()}`}
                pinColor="orange"
                onPress={() => handlePinPress(pin)}
              />
            )
          })}
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

        {/* Creating pin overlay */}
        {isCreatingPin && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2A9D8F" />
            <Text style={styles.loadingText}>Creating audio pin...</Text>
          </View>
        )}

        {/* Loading pins indicator */}
        {isLoadingPins && (
          <View style={styles.topLoadingIndicator}>
            <ActivityIndicator size="small" color="#2A9D8F" />
            <Text style={styles.topLoadingText}>Loading pins...</Text>
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
        
        {/* Record button */}
        <TouchableOpacity 
          style={styles.recordButton}
          onPress={handleRecordButtonPress}
        >
          <AudioIcon size={24} />
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

      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        visible={isRecordingModalVisible}
        onClose={handleRecordingModalClose}
        onSendRecording={handleRecordingSend}
      />

      {/* Audio Playback Modal */}
      <AudioPlaybackModal
        visible={isPlaybackModalVisible}
        onClose={handlePlaybackModalClose}
        pin={selectedPin}
        onDelete={handlePinDelete}
      />
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
    bottom: 120, // Closer to navigation bar (was 100, now 120 to account for nav bar height)
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
  topLoadingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2A9D8F',
    fontWeight: '500',
  },
})

export default MapScreen 