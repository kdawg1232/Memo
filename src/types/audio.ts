import { Audio } from 'expo-av'

// Audio recording status
export type AudioRecordingStatus = 'idle' | 'recording' | 'stopping' | 'stopped'

// Audio playback status  
export type AudioPlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error'

// Audio permission status
export type AudioPermissionStatus = 'granted' | 'denied' | 'undetermined'

// Audio recording settings
export interface AudioRecordingOptions {
  android: {
    extension: '.m4a'
    outputFormat: number
    audioEncoder: number
    sampleRate: number
    numberOfChannels: number
    bitRate: number
  }
  ios: {
    extension: '.m4a'
    outputFormat: number
    audioQuality: number
    sampleRate: number
    numberOfChannels: number
    bitRate: number
    linearPCMBitDepth: number
    linearPCMIsBigEndian: boolean
    linearPCMIsFloat: boolean
  }
  web: {
    mimeType: string
    bitsPerSecond: number
  }
}

// Audio file metadata
export interface AudioFileInfo {
  uri: string
  duration: number // in milliseconds
  size: number // in bytes
  format: string
}

// Recording result
export interface RecordingResult {
  uri: string | null
  duration: number | null
  error: string | null
}

// Playback result
export interface PlaybackResult {
  success: boolean
  error: string | null
}

// Audio recording hook state
export interface AudioRecordingState {
  status: AudioRecordingStatus
  recording: Audio.Recording | null
  recordedUri: string | null
  duration: number | null
  error: string | null
}

// Audio playback hook state
export interface AudioPlaybackState {
  status: AudioPlaybackStatus
  sound: Audio.Sound | null
  position: number
  duration: number | null
  error: string | null
}

// Default audio recording settings
export const DEFAULT_RECORDING_OPTIONS: AudioRecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: 4, // MPEG_4 format
    audioEncoder: 3, // AAC encoder
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 4, // MPEG_4 format
    audioQuality: 1, // High quality
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm;codecs=opus',
    bitsPerSecond: 128000,
  },
} 