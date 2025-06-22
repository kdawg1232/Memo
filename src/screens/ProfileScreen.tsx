import React, { useState, useEffect, useRef } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  Image
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { fetchUserPins, AudioPin, deleteAudioPin, DatabaseService, PendingGroupInvitation } from '../services/database'
import { useAudioPlayer, AudioModule } from 'expo-audio'
import * as Location from 'expo-location'
// import * as ImagePicker from 'expo-image-picker'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = 50 // Minimum swipe distance to trigger delete

interface ProfileScreenProps {
  onNavigateBack: () => void
  onNavigateToSettings: () => void
}

interface UserStats {
  pinCount: number
  discoveryCount: number
}

interface PinWithLocation extends AudioPin {
  locationName: string
  addressLine: string
  cityStateLine: string
  isPlaying?: boolean
  isPaused?: boolean
  currentTime?: number
  progress?: number
}

// Separate component for individual pin items to handle swipe gestures
interface PinItemProps {
  item: PinWithLocation
  onPlay: (item: PinWithLocation) => void
  onDelete: (pinId: string, resetPinPosition: () => void) => void
  formatDate: (dateString: string) => string
  formatDuration: (seconds?: number | null) => string
  formatCurrentTime: (seconds: number) => string
  onResetAllSwipes: () => void // Add function to reset all other swipes
}

const PinItem: React.FC<PinItemProps> = ({ 
  item, 
  onPlay, 
  onDelete, 
  formatDate, 
  formatDuration, 
  formatCurrentTime,
  onResetAllSwipes
}) => {
  const translateX = useRef(new Animated.Value(0)).current
  const backgroundOpacity = useRef(new Animated.Value(0)).current
  const [isSwipeActive, setIsSwipeActive] = useState(false)
  
  // Function to reset pin to normal position
  const resetPinPosition = () => {
    setIsSwipeActive(false)
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start()
  }
  
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes to the right with minimum threshold
      const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2
      const isRightSwipe = gestureState.dx > 15
      return isHorizontalSwipe && isRightSwipe
    },
    
    onPanResponderGrant: () => {
      // Reset all other swipes first
      onResetAllSwipes()
      
      setIsSwipeActive(true)
      // Show the delete background immediately
      Animated.timing(backgroundOpacity, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: false,
      }).start()
    },
    
    onPanResponderMove: (evt, gestureState) => {
      // Follow the finger drag smoothly - only allow swiping to the right
      const maxSwipe = SCREEN_WIDTH * 0.75 // Allow up to 75% of screen width
      const dx = Math.max(0, Math.min(gestureState.dx, maxSwipe))
      
      // Set translation directly for smooth following
      translateX.setValue(dx)
      
      // Update background opacity based on swipe progress (more gradual)
      const progress = Math.min(dx / SWIPE_THRESHOLD, 1)
      const opacity = 0.3 + (progress * 0.7) // Range from 0.3 to 1.0
      backgroundOpacity.setValue(opacity)
    },
    
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > SWIPE_THRESHOLD) {
        // Complete the delete action - slide all the way out
        Animated.timing(translateX, {
          toValue: SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: false,
        }).start(() => {
          // Pass both the pin ID and the reset function to the delete handler
          onDelete(item.id, resetPinPosition)
        })
      } else {
        // Snap back to original position with smooth spring animation
        resetPinPosition()
      }
    },
    
    onPanResponderTerminate: () => {
      // Handle gesture termination (e.g., if another gesture takes over)
      resetPinPosition()
    },
  })
  
  // Register this pin's reset function
  useEffect(() => {
    const pinRef = {
      resetPinPosition
    }
    // This will be handled by the parent component
    return () => {
      // Cleanup if needed
    }
  }, [])

  return (
    <View style={styles.pinItemContainer}>
      {/* Delete background */}
      <Animated.View 
        style={[
          styles.deleteBackground,
          { opacity: backgroundOpacity }
        ]}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>
      
      {/* Main pin item */}
      <Animated.View 
        style={[
          { transform: [{ translateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={[styles.pinItem, (item.isPlaying || item.isPaused) && styles.pinItemPlaying]} 
          onPress={() => {
            // If swipe is active, reset it when clicking
            if (isSwipeActive) {
              resetPinPosition()
            } else {
              // Only handle play if not swiping
              onPlay(item)
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.pinHeader}>
            <View style={styles.pinInfo}>
              <Text style={styles.pinLocation} numberOfLines={1} ellipsizeMode="tail">
                {item.addressLine}
              </Text>
              {item.cityStateLine ? (
                <Text style={styles.pinCityState} numberOfLines={1} ellipsizeMode="tail">
                  {item.cityStateLine}
                </Text>
              ) : null}
              <Text style={styles.pinDate}>
                {formatDate(item.created_at)} • {formatDuration(item.duration)}
              </Text>
            </View>
            <View style={styles.playButton}>
              <View style={styles.playButtonIcon}>
                {item.isPlaying || item.isPaused ? (
                  item.isPlaying ? (
                    <Text style={styles.pauseButtonText}>⏸︎</Text>
                  ) : (
                    <Text style={styles.playButtonText}>▶</Text>
                  )
                ) : (
                  <Text style={styles.playButtonText}>▶</Text>
                )}
              </View>
            </View>
          </View>
          
          {/* Progress bar - show only when playing, hide when paused */}
          {item.isPlaying && !item.isPaused && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(item.progress || 0) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressTime}>
                {formatCurrentTime(item.currentTime || 0)} / {formatDuration(item.duration)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigateBack, onNavigateToSettings }) => {
  const { user, userProfile, refreshUserProfile } = useAuth()
  const [stats, setStats] = useState<UserStats>({ pinCount: 0, discoveryCount: 0 })
  const [userPins, setUserPins] = useState<PinWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<PendingGroupInvitation[]>([])
  
  // Audio player setup
  const audioPlayer = useAudioPlayer()
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Refs to track swipe states across all pins
  const pinRefs = useRef<{ [key: string]: { resetPinPosition: () => void } }>({})
  
  // Function to reset all swipe states
  const resetAllSwipes = () => {
    Object.values(pinRefs.current).forEach(ref => {
      if (ref.resetPinPosition) {
        ref.resetPinPosition()
      }
    })
  }

  // Load user data when component mounts
  useEffect(() => {
    loadUserData()
  }, [])

  // Configure audio mode
  useEffect(() => {
    const configureAudioMode = async () => {
      try {
        await AudioModule.setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'mixWithOthers',
          interruptionModeAndroid: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        })
      } catch (error) {
        console.error('Error configuring audio mode:', error)
      }
    }
    
    configureAudioMode()
  }, [])

  // Monitor audio playback progress
  useEffect(() => {
    if (currentlyPlayingId && audioPlayer) {
      progressIntervalRef.current = setInterval(() => {
        try {
          if (audioPlayer.playing && !isPaused) {
            const current = audioPlayer.currentTime || 0
            const total = audioPlayer.duration || 0
            
            // Update the specific pin's progress
            setUserPins(prevPins => 
              prevPins.map(pin => 
                pin.id === currentlyPlayingId 
                  ? { 
                      ...pin, 
                      currentTime: current, 
                      progress: total > 0 ? current / total : 0,
                      isPlaying: true,
                      isPaused: false,
                      duration: total > 0 ? Math.floor(total) : pin.duration // Update duration if we get it from player
                    }
                  : { ...pin, isPlaying: false, isPaused: false }
              )
            )

            // Check if finished - auto reset to beginning
            if (current >= total && total > 0) {
              console.log('🔄 Audio finished, resetting to beginning')
              handleResetAudio()
            }
          }
        } catch (error) {
          console.error('Error monitoring playback:', error)
        }
      }, 200)
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [currentlyPlayingId, audioPlayer, isPaused])

  /**
   * Reverse geocode coordinates to get location name
   */
  const getLocationName = async (lat: number, lng: number): Promise<{
    locationName: string
    addressLine: string
    cityStateLine: string
  }> => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      if (result && result.length > 0) {
        const location = result[0]
        
        // Build address line (street number + street name, avoid duplicates)
        const addressParts = []
        if (location.streetNumber) addressParts.push(location.streetNumber)
        if (location.street) {
          addressParts.push(location.street)
        } else if (location.name) {
          // Only use name if we don't have a street
          addressParts.push(location.name)
        }
        
        // Build city/state line
        const cityStateParts = []
        if (location.city) cityStateParts.push(location.city)
        if (location.region) cityStateParts.push(location.region)
        
        const addressLine = addressParts.length > 0 ? addressParts.join(' ') : ''
        const cityStateLine = cityStateParts.length > 0 ? cityStateParts.join(', ') : ''
        const fullLocation = [addressLine, cityStateLine].filter(Boolean).join(', ')
        
        return {
          locationName: fullLocation || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          addressLine: addressLine || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          cityStateLine: cityStateLine
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error)
    }
    
    // Fallback to coordinates if geocoding fails
    const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    return {
      locationName: coords,
      addressLine: coords,
      cityStateLine: ''
    }
  }

  /**
   * Load user statistics and pins
   */
  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Fetch user's pins
      const pinsResult = await fetchUserPins()
      if (pinsResult.success && pinsResult.pins) {
        const pins = pinsResult.pins
        
        // Debug: Log pin data to check duration values
        console.log('📊 User pins data:', pins.map(pin => ({
          id: pin.id,
          duration: pin.duration,
          created_at: pin.created_at,
          audio_url: pin.audio_url
        })))
        
        // Get location names for each pin and handle missing durations
        const pinsWithLocations: PinWithLocation[] = await Promise.all(
          pins.map(async (pin) => {
            const locationData = await getLocationName(pin.lat, pin.lng)
            
            // For pins with missing duration, we'll get the real duration when playing
            // But show a placeholder until then
            let displayDuration = pin.duration
            if (!displayDuration || displayDuration === 0) {
              console.log('🔧 Pin has no duration (will get from audio player when played):', pin.id)
              displayDuration = undefined // We'll get this when playing
            }
            
            return {
              ...pin,
              ...locationData,
              duration: displayDuration,
              isPlaying: false,
              isPaused: false,
              currentTime: 0,
              progress: 0
            }
          })
        )
        
        setUserPins(pinsWithLocations)
        
        // Calculate stats
        const pinCount = pins.length
        // TODO: Implement discovery count by tracking pin plays in database
        const discoveryCount = Math.floor(pinCount * 2.3) // Mock data for now
        
        setStats({ pinCount, discoveryCount })
      } else {
        console.error('Error fetching user pins:', pinsResult.error)
        setUserPins([])
        setStats({ pinCount: 0, discoveryCount: 0 })
      }

      // Load pending group invitations
      await loadPendingInvitations()
    } catch (error) {
      console.error('Error loading user data:', error)
      Alert.alert('Error', 'Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load pending group invitations for the user
   */
  const loadPendingInvitations = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await DatabaseService.getPendingGroupInvitations(user.id)
      
      if (error) {
        console.error('Error fetching pending invitations:', error)
        return
      }

      if (data) {
        setPendingInvitations(data)
        console.log(`📨 Found ${data.length} pending group invitations`)
      }
    } catch (error) {
      console.error('Exception loading pending invitations:', error)
    }
  }

  /**
   * Handle group invitation response (accept/decline)
   */
  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    try {
      const { error } = await DatabaseService.respondToGroupInvitation(invitationId, response)
      
      if (error) {
        Alert.alert('Error', 'Failed to respond to invitation. Please try again.')
        return
      }

      // Remove the invitation from the list
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      
      Alert.alert(
        'Success',
        `Group invitation ${response === 'accepted' ? 'accepted' : 'declined'} successfully!`
      )
    } catch (error) {
      console.error('Error responding to invitation:', error)
      Alert.alert('Error', 'Failed to respond to invitation. Please try again.')
    }
  }

  /**
   * Play audio for a specific pin
   */
  const handlePlayAudio = async (pin: PinWithLocation) => {
    try {
      // Stop any currently playing audio from other pins
      if (currentlyPlayingId && currentlyPlayingId !== pin.id) {
        await handleStopAudio()
      }

      if (currentlyPlayingId === pin.id) {
        // If same pin is already playing, toggle pause/play
        if (isPaused) {
          // Resume playback
          console.log('▶️ Resuming audio playback')
          await audioPlayer.play()
          setIsPaused(false)
          
          // Update pin state to show it's playing
          setUserPins(prevPins => 
            prevPins.map(p => 
              p.id === pin.id 
                ? { ...p, isPlaying: true, isPaused: false }
                : p
            )
          )
        } else {
          // Pause playback
          console.log('⏸️ Pausing audio playback')
          await audioPlayer.pause()
          setIsPaused(true)
          
          // Update pin state to show it's paused
          setUserPins(prevPins => 
            prevPins.map(p => 
              p.id === pin.id 
                ? { ...p, isPlaying: false, isPaused: true }
                : p
            )
          )
        }
        return
      }

      console.log('🎵 Playing audio:', pin.audio_url)
      
      // Load the audio first
      audioPlayer.replace(pin.audio_url)
      
      // Wait for the audio to load and get duration before playing
      let attempts = 0
      const maxAttempts = 10
      const checkDuration = () => {
        attempts++
        const actualDuration = audioPlayer.duration
        
        if (actualDuration && actualDuration > 0) {
          console.log('🕐 Got actual audio duration:', actualDuration, 'seconds')
          
          // Update the pin with the real duration
          setUserPins(prevPins => 
            prevPins.map(p => 
              p.id === pin.id 
                ? { ...p, duration: Math.floor(actualDuration) }
                : p
            )
          )
        } else if (attempts < maxAttempts) {
          // Try again after a short delay
          setTimeout(checkDuration, 200)
        }
      }
      
      // Start checking for duration
      setTimeout(checkDuration, 100)
      
      // Play the audio
      await audioPlayer.play()
      setCurrentlyPlayingId(pin.id)
      setIsPaused(false)
      
    } catch (error) {
      console.error('Error playing audio:', error)
      Alert.alert('Playback Error', 'Failed to play audio. Please try again.')
    }
  }

  /**
   * Reset audio to beginning (called when audio finishes)
   */
  const handleResetAudio = async () => {
    try {
      console.log('🔄 Resetting audio to beginning')
      await audioPlayer.pause()
      
      // Reset position to beginning
      if (audioPlayer.seekTo) {
        await audioPlayer.seekTo(0)
      }
      
      setCurrentlyPlayingId(null)
      setIsPaused(false)
      
      // Reset all pins' playing state and position
      setUserPins(prevPins => 
        prevPins.map(pin => ({ 
          ...pin, 
          isPlaying: false, 
          isPaused: false,
          currentTime: 0, 
          progress: 0 
        }))
      )
      
      // Reset all swipe states
      resetAllSwipes()
    } catch (error) {
      console.error('Error resetting audio:', error)
    }
  }

  /**
   * Stop audio playback
   */
  const handleStopAudio = async () => {
    try {
      await audioPlayer.pause()
      setCurrentlyPlayingId(null)
      setIsPaused(false)
      
      // Reset all pins' playing state
      setUserPins(prevPins => 
        prevPins.map(pin => ({ 
          ...pin, 
          isPlaying: false, 
          isPaused: false,
          currentTime: 0, 
          progress: 0 
        }))
      )
      
      // Reset all swipe states when audio stops
      resetAllSwipes()
    } catch (error) {
      console.error('Error stopping audio:', error)
    }
  }

  /**
   * Handle profile picture upload - placeholder for now
   */
  const handleProfilePictureUpload = async () => {
    Alert.alert(
      'Profile Picture',
      'Profile picture upload requires a development build with expo-image-picker. Would you like to:\n\n1. Build a new development build\n2. Skip this feature for now',
      [
        {
          text: 'Skip for Now',
          style: 'cancel'
        },
        {
          text: 'Learn How to Build',
          onPress: () => {
            Alert.alert(
              'Development Build Required',
              'To use profile pictures:\n\n1. Run: npx expo run:ios (or run:android)\n2. Or build with EAS: eas build --profile development\n\nThis adds the native module to your custom development client.',
              [{ text: 'OK' }]
            )
          }
        }
      ]
    )
  }

  /**
   * Format date for display (show time instead of just date)
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      // Show time if recorded today
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } else {
      // Show date if recorded on a different day
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  /**
   * Format duration for display
   */
  const formatDuration = (seconds?: number | null): string => {
    console.log('🕐 Formatting duration:', seconds) // Debug log
    
    // Handle null, undefined, or 0 duration
    if (!seconds || seconds === 0) {
      return '0:00' // Show 0:00 instead of Loading...
    }
    
    // Handle negative durations (shouldn't happen but just in case)
    if (seconds < 0) {
      return '0:00'
    }
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Format current time for display
   */
  const formatCurrentTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Handle pin deletion with confirmation
   */
  const handleDeletePin = async (pinId: string, resetPinPosition: () => void) => {
    Alert.alert(
      'Delete Audio Pin',
      'Are you sure you want to delete this audio pin? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            // Reset the pin position when user cancels
            console.log('❌ Delete cancelled, resetting pin position')
            resetPinPosition()
          }
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting audio pin:', pinId)
              
              // Stop audio if this pin is currently playing
              if (currentlyPlayingId === pinId) {
                await handleStopAudio()
              }
              
              const result = await deleteAudioPin(pinId)
              
              if (result.success) {
                console.log('✅ Pin deleted successfully')
                
                // Remove the pin from local state and refresh stats
                setUserPins(prevPins => {
                  const newPins = prevPins.filter(pin => pin.id !== pinId)
                  // Update stats
                  setStats(prevStats => ({
                    ...prevStats,
                    pinCount: newPins.length,
                    discoveryCount: Math.floor(newPins.length * 2.3)
                  }))
                  return newPins
                })
                
                Alert.alert('Success', 'Audio pin deleted successfully!')
              } else {
                console.error('❌ Failed to delete pin:', result.error)
                Alert.alert('Delete Failed', result.error || 'Unable to delete audio pin. Please try again.')
                // Reset pin position on error
                resetPinPosition()
              }
            } catch (error) {
              console.error('❌ Error deleting pin:', error)
              Alert.alert('Error', 'An unexpected error occurred while deleting the pin.')
              // Reset pin position on error
              resetPinPosition()
            }
          }
        }
      ]
    )
  }

  /**
   * Render individual pin item (now simplified)
   */
  const renderPinItem = ({ item }: { item: PinWithLocation }) => (
    <PinItem
      item={item}
      onPlay={handlePlayAudio}
      onDelete={(pinId: string, resetPinPosition: () => void) => handleDeletePin(pinId, resetPinPosition)}
      formatDate={formatDate}
      formatDuration={formatDuration}
      formatCurrentTime={formatCurrentTime}
      onResetAllSwipes={resetAllSwipes}
    />
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    )
  }

  return (
    <View 
      style={styles.container}
      onTouchStart={() => {
        // Reset audio and swipes when touching anywhere on screen
        if (currentlyPlayingId) {
          handleResetAudio()
        } else {
          resetAllSwipes()
        }
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={onNavigateToSettings}>
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        onTouchStart={(e) => {
          // Stop event propagation to prevent double handling
          e.stopPropagation()
          
          // Reset all swipes when user touches the scroll view
          resetAllSwipes()
        }}
      >
        {/* User Info Section */}
        <View style={styles.userSection}>
          <TouchableOpacity 
            style={styles.userAvatar} 
            onPress={handleProfilePictureUpload}
            disabled={uploadingProfilePicture}
          >
            {uploadingProfilePicture ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : userProfile?.profile_picture_url ? (
              <Image 
                source={{ uri: userProfile.profile_picture_url }} 
                style={styles.userAvatarImage}
              />
            ) : (
              <Text style={styles.userAvatarText}>
                {userProfile ? userProfile.first_name.charAt(0).toUpperCase() + userProfile.last_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
              </Text>
            )}
            {/* Upload indicator overlay */}
            {!uploadingProfilePicture && (
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          {userProfile ? (
            <Text style={styles.userName}>{userProfile.first_name} {userProfile.last_name}</Text>
          ) : (
            <Text style={styles.userName}>Loading...</Text>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.pinCount}</Text>
            <Text style={styles.statLabel}>Audio Pins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.discoveryCount}</Text>
            <Text style={styles.statLabel}>Discoveries</Text>
          </View>
        </View>

        {/* Audio Pins Section */}
        <View style={styles.pinsSection}>
          <Text style={styles.sectionTitle}>Your Audio Pins</Text>
          {userPins.length > 0 ? (
            <FlatList
              data={userPins}
              renderItem={renderPinItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No Audio Pins Yet</Text>
              <Text style={styles.emptyStateDescription}>
                Start recording your first audio memo on the map to see it here!
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#808080',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerLeft: {
    width: 40, // Balance the settings button on the right
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  userSection: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarOverlayText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#808080',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
  },

  pinsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  pinItemContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  pinItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  pinItemPlaying: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pinInfo: {
    flex: 1,
    marginRight: 12,
  },
  pinLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  pinCityState: {
    fontSize: 14,
    color: '#404040',
    marginBottom: 4,
  },
  pinDate: {
    fontSize: 12,
    color: '#808080',
  },
  playButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  playButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  pauseButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  progressTime: {
    fontSize: 12,
    color: '#808080',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },

  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 12,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Group invitations styles
  invitationsSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  invitationAlert: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#000000',
  },
  invitationAlertText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    textAlign: 'center',
  },
  invitationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  invitationInfo: {
    marginBottom: 16,
  },
  invitationGroupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  invitationFromText: {
    fontSize: 14,
    color: '#404040',
    marginBottom: 2,
  },
  invitationDateText: {
    fontSize: 12,
    color: '#808080',
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#404040',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
})

export default ProfileScreen 