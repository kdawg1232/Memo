import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { useAudioPlayer, AudioModule } from 'expo-audio';
import { AudioPin } from '../services/database';

interface AudioPlaybackModalProps {
  visible: boolean;
  onClose: () => void;
  pin: AudioPin | null;
  onDelete?: (pinId: string) => void;
}

type PlaybackState = 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

const AudioPlaybackModal: React.FC<AudioPlaybackModalProps> = ({
  visible,
  onClose,
  pin,
  onDelete,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create audio player - we'll replace the source when modal opens
  const audioPlayer = useAudioPlayer();

  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Configure audio mode and load audio source when modal opens
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
        });
      } catch (error) {
        console.error('Error configuring audio mode:', error);
      }
    };

    if (visible && pin && pin.audio_url) {
      console.log('🎵 Loading audio source into player:', pin.audio_url);
      
      configureAudioMode();
      
      // Load the audio source into the player
      try {
        audioPlayer.replace(pin.audio_url);
        console.log('✅ Audio source loaded into player');
        
        // Wait a moment for the source to be processed
        setTimeout(() => {
          console.log('🎵 Audio Player after source loading:');
          console.log('  - isLoaded:', audioPlayer.isLoaded);
          console.log('  - duration:', audioPlayer.duration);
          console.log('  - currentTime:', audioPlayer.currentTime);
        }, 1000);
        
      } catch (loadError) {
        console.error('❌ Error loading audio source:', loadError);
      }
      
      setPlaybackState('stopped');
      setCurrentTime(0);
      setDuration(pin.duration || 0);
      progressAnimation.setValue(0);
    }
  }, [visible, pin]);

  // Monitor player state changes with a simple interval
  useEffect(() => {
    if (!audioPlayer || !visible) return;

    const startMonitoring = () => {
      timeIntervalRef.current = setInterval(() => {
        try {
          if (audioPlayer.playing) {
            const current = audioPlayer.currentTime || 0;
            const total = audioPlayer.duration || pin?.duration || 0;
            
            setCurrentTime(current);
            setDuration(total);
            
            // Update progress animation
            if (total > 0) {
              const progress = current / total;
              progressAnimation.setValue(Math.min(progress, 1));
            }

            // Check if finished
            if (current >= total && total > 0) {
              setPlaybackState('stopped');
              setCurrentTime(0);
              progressAnimation.setValue(0);
              clearInterval(timeIntervalRef.current!);
            } else {
              setPlaybackState('playing');
            }
          } else if (audioPlayer.paused) {
            setPlaybackState('paused');
          }
        } catch (error) {
          console.error('Error monitoring playback:', error);
        }
      }, 200);
    };

    if (playbackState === 'playing') {
      startMonitoring();
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [audioPlayer, playbackState, visible, pin]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, []);

  // Play/pause animation
  useEffect(() => {
    if (playbackState === 'playing') {
      // Pulse animation for play button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [playbackState]);

  // Test URL accessibility
  const testAudioUrl = async (url: string) => {
    try {
      console.log('🔍 Testing audio URL accessibility...');
      const response = await fetch(url, { method: 'HEAD' });
      console.log('📡 URL Response Status:', response.status);
      console.log('📡 URL Response Headers:', Object.fromEntries(response.headers.entries()));
      return response.ok;
    } catch (error) {
      console.error('❌ URL fetch error:', error);
      return false;
    }
  };

  // Play audio
  const playAudio = async () => {
    try {
      console.log('🎵 Attempting to play audio:', pin?.audio_url);
      
      if (!audioPlayer) {
        console.error('❌ Audio player not initialized');
        setPlaybackState('error');
        Alert.alert('Playback Error', 'Audio player not ready. Please try again.');
        return;
      }

      if (!pin?.audio_url) {
        console.error('❌ No audio URL available');
        setPlaybackState('error');
        Alert.alert('Playback Error', 'No audio file found for this pin.');
        return;
      }

      // Test URL accessibility first
      const isUrlAccessible = await testAudioUrl(pin.audio_url);
      console.log('🔍 URL accessible:', isUrlAccessible);

      // Log audio player properties
      console.log('🎵 Audio Player State:');
      console.log('  - isLoaded:', audioPlayer.isLoaded);
      console.log('  - duration:', audioPlayer.duration);
      console.log('  - currentTime:', audioPlayer.currentTime);
      console.log('  - playing:', audioPlayer.playing);
      console.log('  - paused:', audioPlayer.paused);

      setPlaybackState('loading');
      console.log('▶️ Calling audioPlayer.play()...');
      
      // Try to play the audio
      audioPlayer.play();
      
      console.log('✅ Play command sent successfully');
      
      // Wait a bit and check if it's actually playing
      setTimeout(() => {
        console.log('🔍 Post-play Audio Player State:');
        console.log('  - isLoaded:', audioPlayer.isLoaded);
        console.log('  - duration:', audioPlayer.duration);
        console.log('  - currentTime:', audioPlayer.currentTime);
        console.log('  - playing:', audioPlayer.playing);
        console.log('  - paused:', audioPlayer.paused);
        
        if (audioPlayer.isLoaded && audioPlayer.duration > 0) {
          setPlaybackState('playing');
        } else {
          console.warn('⚠️ Audio not properly loaded after play command');
          setPlaybackState('error');
          Alert.alert('Playback Error', 'Audio file could not be loaded. The file might be corrupted or inaccessible.');
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      setPlaybackState('error');
      Alert.alert('Playback Error', 'Unable to play this audio file. Please check your internet connection.');
    }
  };

  // Pause audio
  const pauseAudio = async () => {
    try {
      if (audioPlayer) {
        audioPlayer.pause();
        setPlaybackState('paused');
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  // Stop audio
  const stopAudio = async () => {
    try {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.seekTo(0);
        setPlaybackState('stopped');
        setCurrentTime(0);
        progressAnimation.setValue(0);
        
        if (timeIntervalRef.current) {
          clearInterval(timeIntervalRef.current);
        }
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  // Close modal and cleanup
  const handleClose = () => {
    stopAudio();
    onClose();
  };

  // Delete pin
  const handleDelete = () => {
    if (!pin) return;
    
    Alert.alert(
      'Delete Audio Pin',
      'Are you sure you want to delete this audio pin? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ Deleting pin:', pin.id);
            onDelete?.(pin.id);
            handleClose();
          },
        },
      ]
    );
  };

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format creation date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!pin) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Audio Pin</Text>
            <View style={styles.headerButtons}>
              {onDelete && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pin Info */}
          <View style={styles.pinInfo}>
            <Text style={styles.pinTitle}>
              {pin.title || 'Voice Memo'}
            </Text>
            <Text style={styles.pinDate}>
              {formatDate(pin.created_at)}
            </Text>
            {pin.description && (
              <Text style={styles.pinDescription}>
                {pin.description}
              </Text>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
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

          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Playback Controls */}
          <View style={styles.controlsContainer}>
            {/* Stop Button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={stopAudio}
              disabled={playbackState === 'stopped' || playbackState === 'loading'}
            >
              <View style={[styles.stopIcon, { 
                opacity: playbackState === 'stopped' || playbackState === 'loading' ? 0.3 : 1 
              }]} />
            </TouchableOpacity>

            {/* Main Play/Pause Button */}
            <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
              <TouchableOpacity
                style={[
                  styles.playButton,
                  playbackState === 'playing' && styles.playButtonActive,
                ]}
                onPress={playbackState === 'playing' ? pauseAudio : playAudio}
                disabled={playbackState === 'loading' || playbackState === 'error'}
              >
                {playbackState === 'loading' ? (
                  <Text style={styles.playButtonText}>...</Text>
                ) : playbackState === 'playing' ? (
                  <Text style={styles.playButtonText}>⏸️</Text>
                ) : (
                  <Text style={styles.playButtonText}>▶️</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Placeholder for future controls */}
            <View style={styles.controlButton} />
          </View>

          {/* Error State */}
          {playbackState === 'error' && (
            <Text style={styles.errorText}>
              Unable to play this audio file
            </Text>
          )}

          {/* Debug Info */}
          {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                State: {playbackState} | Time: {formatTime(currentTime)}/{formatTime(duration)}
              </Text>
              <Text style={styles.debugText}>
                URL: {pin.audio_url?.substring(0, 50)}...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#264653',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#E76F51',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#264653',
    fontWeight: 'bold',
  },
  pinInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  pinTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#264653',
    textAlign: 'center',
    marginBottom: 8,
  },
  pinDate: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  pinDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2A9D8F',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'monospace',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#E76F51',
    borderRadius: 2,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A9D8F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playButtonActive: {
    backgroundColor: '#E9C46A',
  },
  playButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  errorText: {
    textAlign: 'center',
    color: '#E76F51',
    fontSize: 14,
    marginTop: 16,
    fontStyle: 'italic',
  },
  debugInfo: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'monospace',
  },
});

export default AudioPlaybackModal; 