import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native'
import { useAudioRecorder, useAudioPlayer, RecordingPresets, AudioModule } from 'expo-audio'

interface VoiceRecordingModalProps {
  visible: boolean
  onClose: () => void
  onAddRecording: (recordingUri: string, durationSeconds: number) => void
}

type RecordingState = 'idle' | 'recording' | 'stopped' | 'playing' | 'paused'

const { width, height } = Dimensions.get('window')
const MAX_RECORDING_DURATION = 30000 // 30 seconds in milliseconds

const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({
  visible,
  onClose,
  onAddRecording,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingUri, setRecordingUri] = useState<string | null>(null)

  // Audio recording setup - Use the working HIGH_QUALITY preset with small modifications
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const audioPlayer = useAudioPlayer()
  
  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current
  const progressAnimation = useRef(new Animated.Value(0)).current
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Request microphone permissions
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        console.log('🔒 Requesting microphone permissions (on modal open)...')
        const { granted } = await AudioModule.requestRecordingPermissionsAsync()
        console.log('🔒 Permission result:', granted)
        if (!granted) {
          console.log('❌ Permission denied on modal open')
          Alert.alert('Permission required', 'Permission to access microphone was denied')
        } else {
          console.log('✅ Permission granted on modal open')
        }
      } catch (error) {
        console.error('❌ Error requesting permissions on modal open:', error)
      }
    }

    if (visible) {
      requestPermissions()
    }
  }, [visible])

  // Enhanced audio mode configuration for better recording quality
  useEffect(() => {
    const configureAudioMode = async () => {
      try {
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
          interruptionModeAndroid: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        })
      } catch (error) {
        console.error('Error configuring audio mode:', error)
      }
    }

    if (visible) {
      configureAudioMode()
    }
  }, [visible])

  // Start pulsing animation for recording state
  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (recordingState === 'recording') {
          pulse()
        }
      })
    }
    pulse()
  }

  // Update recording duration and progress
  const updateDuration = () => {
    if (recordingState === 'recording' && audioRecorder) {
      try {
        // Get actual duration from the recorder
        const actualDuration = audioRecorder.currentTime * 1000 // Convert to milliseconds
        console.log('🕐 Recording duration update:', actualDuration, 'ms')
        
        setRecordingDuration(actualDuration)
        
        // Update progress animation (30 seconds = 100%)
        const progress = Math.min(actualDuration / 30000, 1)
        Animated.timing(progressAnimation, {
          toValue: progress,
          duration: 100,
          useNativeDriver: false,
        }).start()

        // Auto-stop at 30 seconds
        if (actualDuration >= 30000) {
          console.log('⏰ Auto-stopping recording at 30 seconds')
          stopRecording()
        }
      } catch (error) {
        console.error('Error updating duration:', error)
        // Fallback to manual counter
        setRecordingDuration(prev => {
          const newDuration = prev + 100
          return newDuration
        })
      }
    }
  }

  // Start duration tracking
  useEffect(() => {
    if (recordingState === 'recording') {
      durationIntervalRef.current = setInterval(updateDuration, 100)
      startPulseAnimation()
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
      pulseAnimation.setValue(1)
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [recordingState])

  // Start recording
  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording process...')
      
      // Check permissions first
      console.log('🔒 Checking microphone permissions...')
      const { granted } = await AudioModule.requestRecordingPermissionsAsync()
      if (!granted) {
        console.error('❌ Microphone permission denied')
        Alert.alert('Permission Required', 'Please allow microphone access to record audio.')
        return
      }
      console.log('✅ Microphone permission granted')
      
      // Configure for enhanced recording quality and volume
      console.log('🔧 Configuring audio mode...')
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      })
      console.log('✅ Audio mode configured')

      console.log('🔧 Checking audio recorder...')
      if (!audioRecorder) {
        throw new Error('Audio recorder not initialized')
      }
      
      console.log('🔧 Preparing to record...')
      await audioRecorder.prepareToRecordAsync()
      console.log('✅ Recorder prepared')
      
      console.log('🔧 Starting actual recording...')
      audioRecorder.record() // Remove await to match the original working code
      console.log('✅ Recording command sent')
      
      // Check recorder state
      console.log('🎤 Recorder state after start:')
      console.log('  - isRecording:', audioRecorder.isRecording)
      console.log('  - currentTime:', audioRecorder.currentTime)
      console.log('  - uri:', audioRecorder.uri)
      
      setRecordingState('recording')
      setRecordingDuration(0)
      setRecordingUri(null)
      
      // Reset progress animation
      progressAnimation.setValue(0)
      
      console.log('✅ Recording started successfully')
    } catch (error) {
      console.error('❌ Error starting recording:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('❌ Error details:', error)
      Alert.alert('Recording Error', `Failed to start recording: ${errorMessage}`)
    }
  }

  // Stop recording
  const stopRecording = async () => {
    try {
      console.log('🛑 Stopping recording...')
      await audioRecorder.stop()
      
      const uri = audioRecorder.uri
      console.log('🎤 Recording stopped. URI:', uri)
      
      if (uri) {
        // Wait a moment for the file to be fully written
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if the file exists and get its info
        try {
          const response = await fetch(uri)
          const blob = await response.blob()
          console.log('📄 Recording file info:')
          console.log('  - URI:', uri)
          console.log('  - Size:', blob.size, 'bytes')
          console.log('  - Type:', blob.type)
          console.log('  - Duration from recorder:', recordingDuration, 'ms')
          
          if (blob.size === 0) {
            console.error('❌ Recording file is empty!')
            Alert.alert('Recording Error', 'The recording file is empty. Please try recording again.')
            return
          }
          
          setRecordingUri(uri)
          setRecordingState('stopped')
          console.log('✅ Recording successfully saved with', blob.size, 'bytes')
        } catch (fileError) {
          console.error('❌ Error checking recording file:', fileError)
          Alert.alert('Recording Error', 'Unable to access the recording file. Please try again.')
        }
      } else {
        console.error('❌ No recording URI available')
        Alert.alert('Recording Error', 'No recording was created. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error stopping recording:', error)
      Alert.alert('Error', 'Failed to stop recording. Please try again.')
    }
  }

  // Play recording
  const playRecording = async () => {
    if (recordingUri) {
      try {
        console.log('▶️ Attempting to play recording:', recordingUri)
        
        // Configure audio mode for playback
        await AudioModule.setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
          interruptionModeAndroid: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        })

        // Replace the audio source and play
        console.log('🔄 Replacing audio source...')
        audioPlayer.replace({ uri: recordingUri })
        
        console.log('🔊 Setting volume and starting playback...')
        audioPlayer.volume = 1.0
        await audioPlayer.play()
        
        console.log('✅ Audio playback started successfully')
        setRecordingState('playing')
      } catch (error) {
        console.error('❌ Error playing recording:', error)
        // Don't show alert for playback errors, just log them
        // The user can still proceed to add the recording
        console.log('ℹ️ Audio playback failed, but recording can still be added')
      }
    } else {
      console.error('❌ No recording URI to play')
    }
  }

  // Pause playback
  const pausePlayback = () => {
    audioPlayer.pause()
    setRecordingState('stopped')
  }

  // Add recording
  const addRecording = async () => {
    console.log('🚀 addRecording called')
    
    if (recordingUri) {
      try {
        console.log('📤 Preparing to add recording:', recordingUri)
        
        // Final check of the file
        const response = await fetch(recordingUri)
        const blob = await response.blob()
        const durationSeconds = Math.floor(recordingDuration / 1000)
        
        console.log('📤 Final file check:')
        console.log('  - Size:', blob.size, 'bytes')
        console.log('  - Type:', blob.type)
        console.log('  - Duration:', durationSeconds, 'seconds')
        
        if (blob.size === 0) {
          console.error('❌ Cannot add empty recording file!')
          Alert.alert('Add Error', 'The recording file is empty and cannot be added.')
          return
        }
        
        // Pass recording data to parent (which will handle group selection)
        onAddRecording(recordingUri, durationSeconds)
        
        // Reset modal state
        resetModal()
      } catch (error) {
        console.error('❌ Error checking file:', error)
        Alert.alert('Add Error', 'Unable to prepare the recording. Please try again.')
      }
    } else {
      console.error('❌ No recording URI to add')
      Alert.alert('Add Error', 'No recording available to add.')
    }
  }

  // Cancel recording
  const cancelRecording = () => {
    resetModal()
    onClose()
  }

  // Reset modal state
  const resetModal = () => {
    setRecordingState('idle')
    setRecordingDuration(0)
    setRecordingUri(null)
    pulseAnimation.setValue(1)
    progressAnimation.setValue(0)
  }

  // Format duration for display
  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Auto-start pulse animation when modal is visible
  useEffect(() => {
    if (visible && recordingState === 'idle') {
      startPulseAnimation()
    }
  }, [visible])

  // Update duration every 100ms during recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    
    if (recordingState === 'recording') {
      interval = setInterval(updateDuration, 100)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [recordingState])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View 
        style={[
          styles.modalOverlay,
          {
            opacity: visible ? 1 : 0,
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{
                scale: visible ? 1 : 0.9
              }],
              opacity: visible ? 1 : 0,
            }
          ]}
        >
        <Text style={styles.title}>Voice Memo</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]} 
          />
        </View>
        
        {/* Timer */}
        <Text style={styles.timer}>{formatDuration(recordingDuration)}</Text>
        
        {/* Main Action Button */}
        <View style={styles.actionButtonContainer}>
          {recordingState === 'idle' && (
            <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.recordButton]}
                onPress={startRecording}
              >
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {recordingState === 'recording' && (
            <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.stopButton]}
                onPress={stopRecording}
              >
                <View style={styles.stopButtonInner} />
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {(recordingState === 'stopped' || recordingState === 'paused') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.playButton]}
              onPress={playRecording}
            >
              <Text style={styles.playButtonText}>▶</Text>
            </TouchableOpacity>
          )}
          
          {recordingState === 'playing' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.pauseButton]}
              onPress={pausePlayback}
            >
              <Text style={styles.pauseButtonText}>⏸</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Control Buttons */}
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, styles.cancelButton]}
            onPress={cancelRecording}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          {(recordingState === 'stopped' || recordingState === 'playing' || recordingState === 'paused') && (
            <TouchableOpacity
              style={[styles.controlButton, styles.addButton]}
              onPress={addRecording}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 300,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 3,
  },
  timer: {
    fontSize: 18,
    color: '#000000',
    fontFamily: 'Courier',
    marginBottom: 30,
  },
  actionButtonContainer: {
    marginBottom: 30,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recordButton: {
    backgroundColor: '#000000',
  },
  recordButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  stopButton: {
    backgroundColor: '#000000',
  },
  stopButtonInner: {
    width: 25,
    height: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  playButton: {
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#000000',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  pauseButton: {
    backgroundColor: '#000000',
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#404040',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#000000',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default VoiceRecordingModal 