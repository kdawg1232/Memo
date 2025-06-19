import { supabase } from './supabase'
import { Pin, CreatePin, UpdatePin, NearbyPinsQuery, DatabaseResponse } from '../types/database'

// Auth types
export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

// Audio pin types
export interface AudioPin {
  id: string
  user_id: string
  lat: number
  lng: number
  audio_url: string
  title?: string
  description?: string
  duration?: number // Duration in seconds
  file_size?: number // File size in bytes
  created_at: string
  updated_at: string
}

export interface CreateAudioPinData {
  lat: number
  lng: number
  title?: string
  description?: string
  duration?: number
  file_size?: number
}

export interface AudioUploadResult {
  success: boolean
  audioUrl?: string
  error?: string
}

export interface CreatePinResult {
  success: boolean
  pin?: AudioPin
  error?: string
}

export class DatabaseService {
  
  /**
   * Create a new pin in the database
   * @param pin Pin data to create
   * @returns Promise with the created pin or error
   */
  static async createPin(pin: CreatePin): Promise<DatabaseResponse<Pin>> {
    try {
      const { data, error } = await supabase
        .from('pins')
        .insert([pin])
        .select()
        .single()

      if (error) {
        console.error('Error creating pin:', error)
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error creating pin:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Get all pins near a specific location
   * @param query Location and radius parameters
   * @returns Promise with nearby pins or error
   */
  static async getNearbyPins(query: NearbyPinsQuery): Promise<DatabaseResponse<Pin[]>> {
    try {
      // Using Supabase's PostGIS functions for location queries
      // This queries pins within the specified radius (in meters)
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .gte('lat', query.lat - (query.radius / 111320)) // Rough conversion: 1 degree ≈ 111,320 meters
        .lte('lat', query.lat + (query.radius / 111320))
        .gte('lng', query.lng - (query.radius / (111320 * Math.cos(query.lat * Math.PI / 180))))
        .lte('lng', query.lng + (query.radius / (111320 * Math.cos(query.lat * Math.PI / 180))))
        .order('created_at', { ascending: false })
        .limit(query.limit || 50)

      if (error) {
        console.error('Error fetching nearby pins:', error)
        return { data: null, error: new Error(error.message) }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Unexpected error fetching nearby pins:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Get a specific pin by ID
   * @param id Pin ID
   * @returns Promise with the pin or error
   */
  static async getPinById(id: string): Promise<DatabaseResponse<Pin>> {
    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching pin by ID:', error)
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error fetching pin by ID:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Get all pins created by a specific user
   * @param userId User ID
   * @returns Promise with user's pins or error
   */
  static async getUserPins(userId: string): Promise<DatabaseResponse<Pin[]>> {
    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user pins:', error)
        return { data: null, error: new Error(error.message) }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Unexpected error fetching user pins:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Update an existing pin
   * @param pin Pin update data
   * @returns Promise with the updated pin or error
   */
  static async updatePin(pin: UpdatePin): Promise<DatabaseResponse<Pin>> {
    try {
      const { data, error } = await supabase
        .from('pins')
        .update(pin)
        .eq('id', pin.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating pin:', error)
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error updating pin:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Delete a pin by ID
   * @param id Pin ID
   * @returns Promise with success status or error
   */
  static async deletePin(id: string): Promise<DatabaseResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting pin:', error)
        return { data: null, error: new Error(error.message) }
      }

      return { data: true, error: null }
    } catch (error) {
      console.error('Unexpected error deleting pin:', error)
      return { data: null, error: error as Error }
    }
  }
}

// ==========================================
// AUTH METHODS
// ==========================================

export const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// ==========================================
// AUDIO STORAGE METHODS
// ==========================================

/**
 * Upload audio file to Supabase storage
 * Files are stored in: audio/{user_id}/{timestamp}-{filename}
 */
export const uploadAudioFile = async (
  audioUri: string,
  filename?: string
): Promise<AudioUploadResult> => {
  try {
    console.log('🔄 Starting audio upload to Supabase storage...')
    
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Generate filename if not provided
    const timestamp = Date.now()
    const audioFilename = filename || `recording-${timestamp}.m4a`
    const filePath = `${user.id}/${audioFilename}`

    // Read the audio file properly for React Native
    console.log('📥 Reading audio file from URI:', audioUri)
    
    // For React Native, we need to handle the file URI differently
    let fileData: any
    let fileSize: number = 0
    
    try {
      // First, check the file using fetch to get size info
      const fileCheckResponse = await fetch(audioUri)
      if (!fileCheckResponse.ok) {
        console.error('❌ Failed to access audio file. Status:', fileCheckResponse.status)
        return { success: false, error: `Failed to access audio file: ${fileCheckResponse.status}` }
      }
      
      const checkBlob = await fileCheckResponse.blob()
      fileSize = checkBlob.size
      
      console.log('📄 Initial file check:')
      console.log('  - File path for upload:', filePath)
      console.log('  - Local file size:', fileSize, 'bytes')
      console.log('  - File type:', checkBlob.type)
      
      if (fileSize === 0) {
        console.error('❌ Audio file is empty!')
        return { success: false, error: 'Audio file is empty - no data to upload. Please try recording again.' }
      }

      if (fileSize < 1000) { // Less than 1KB is likely an invalid recording
        console.warn('⚠️ Audio file is very small:', fileSize, 'bytes')
        console.log('This might be an incomplete recording')
      }

      // For React Native file uploads, we can use the URI directly or the blob
      // Let's try using the blob first, and if that fails, we'll use the URI
      fileData = checkBlob
      console.log('📤 Using blob data for upload, size:', fileData.size, 'bytes')
      
    } catch (fileError) {
      console.error('❌ Error reading file:', fileError)
      return { success: false, error: 'Failed to read audio file' }
    }

    // Upload to Supabase storage
    console.log('🚀 Uploading to Supabase storage...')
    
    // For React Native, let's try uploading the URI directly instead of blob
    let uploadData: any
    
    try {
      // Method 1: Create a proper File object from the URI for React Native
      console.log('📤 Creating file object from URI...')
      
      // Create a File-like object for React Native upload
      const fileObject = {
        uri: audioUri,
        type: 'audio/m4a',
        name: audioFilename,
      }
      
      console.log('📤 File object created:', fileObject)
      uploadData = fileObject
      
    } catch (fileError) {
      console.error('❌ Failed to create file object, falling back to blob')
      uploadData = fileData
    }
    
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(filePath, uploadData, {
        contentType: 'audio/m4a',
        upsert: false,
      })
    
    console.log('📤 Upload response data:', data)
    console.log('📤 Upload response error:', error)

    if (error) {
      console.error('❌ Storage upload error:', error)
      return { success: false, error: error.message }
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath)

    const audioUrl = publicUrlData.publicUrl
    console.log('🔗 Generated public URL:', audioUrl)

    // Verify the upload by checking the file size
    console.log('🔍 Verifying upload...')
    try {
      const verifyResponse = await fetch(audioUrl)
      console.log('🔍 Verification response status:', verifyResponse.status)
      console.log('🔍 Verification response headers:', Object.fromEntries(verifyResponse.headers.entries()))
      
      if (verifyResponse.ok) {
        const verifyBlob = await verifyResponse.blob()
        console.log('🔍 Uploaded file size verification:', verifyBlob.size, 'bytes')
        
        if (verifyBlob.size === 0) {
          console.error('❌ Uploaded file is empty! Upload failed.')
          return { success: false, error: 'File uploaded but appears empty in storage' }
        }
        
        if (verifyBlob.size !== fileSize) {
          console.warn('⚠️ Size mismatch - Local:', fileSize, 'bytes, Uploaded:', verifyBlob.size, 'bytes')
        }
      } else {
        console.warn('⚠️ Could not verify upload, but continuing anyway')
      }
    } catch (verifyError) {
      console.warn('⚠️ Upload verification failed:', verifyError)
      // Continue anyway - verification is just a check
    }

    console.log('✅ Audio uploaded successfully:', audioUrl)
    return { success: true, audioUrl }

  } catch (error) {
    console.error('❌ Upload error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Delete audio file from storage
 */
export const deleteAudioFile = async (audioUrl: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Extract file path from URL
    const url = new URL(audioUrl)
    const pathParts = url.pathname.split('/')
    const filePath = pathParts.slice(-2).join('/') // Get user_id/filename

    const { error } = await supabase.storage
      .from('audio')
      .remove([filePath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting audio file:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    }
  }
}

// ==========================================
// AUDIO PIN METHODS
// ==========================================

/**
 * Create a new audio pin with uploaded audio
 */
export const createAudioPin = async (
  audioUri: string,
  pinData: CreateAudioPinData,
  filename?: string
): Promise<CreatePinResult> => {
  try {
    console.log('🔄 Creating audio pin...')
    
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // First, upload the audio file
    const uploadResult = await uploadAudioFile(audioUri, filename)
    if (!uploadResult.success || !uploadResult.audioUrl) {
      return { success: false, error: uploadResult.error || 'Audio upload failed' }
    }

    // Create the pin record in the database
    const { data, error } = await supabase
      .from('pins')
      .insert({
        user_id: user.id,
        lat: pinData.lat,
        lng: pinData.lng,
        audio_url: uploadResult.audioUrl,
        title: pinData.title,
        description: pinData.description,
        duration: pinData.duration,
        file_size: pinData.file_size,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      // Clean up uploaded file if database insert fails
      await deleteAudioFile(uploadResult.audioUrl)
      return { success: false, error: error.message }
    }

    console.log('✅ Audio pin created successfully:', data.id)
    return { success: true, pin: data as AudioPin }

  } catch (error) {
    console.error('❌ Create pin error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create pin' 
    }
  }
}

/**
 * Fetch all audio pins (with optional location-based filtering)
 */
export const fetchAudioPins = async (
  bounds?: {
    northEast: { lat: number; lng: number }
    southWest: { lat: number; lng: number }
  }
): Promise<{ success: boolean; pins?: AudioPin[]; error?: string }> => {
  try {
    let query = supabase
      .from('pins')
      .select('*')
      .order('created_at', { ascending: false })

    // Add location bounds filter if provided
    if (bounds) {
      query = query
        .gte('lat', bounds.southWest.lat)
        .lte('lat', bounds.northEast.lat)
        .gte('lng', bounds.southWest.lng)
        .lte('lng', bounds.northEast.lng)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching pins:', error)
      return { success: false, error: error.message }
    }

    return { success: true, pins: data as AudioPin[] }

  } catch (error) {
    console.error('Error fetching pins:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch pins' 
    }
  }
}

/**
 * Fetch pins created by the current user
 */
export const fetchUserPins = async (): Promise<{ success: boolean; pins?: AudioPin[]; error?: string }> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, pins: data as AudioPin[] }

  } catch (error) {
    console.error('Error fetching user pins:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch pins' 
    }
  }
}

/**
 * Delete an audio pin (and its associated audio file)
 */
export const deleteAudioPin = async (pinId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, get the pin to retrieve the audio URL
    const { data: pin, error: fetchError } = await supabase
      .from('pins')
      .select('audio_url, user_id')
      .eq('id', pinId)
      .single()

    if (fetchError || !pin) {
      return { success: false, error: 'Pin not found' }
    }

    // Verify user owns this pin
    const user = await getCurrentUser()
    if (!user || user.id !== pin.user_id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Delete the audio file from storage
    await deleteAudioFile(pin.audio_url)

    // Delete the pin record from database
    const { error: deleteError } = await supabase
      .from('pins')
      .delete()
      .eq('id', pinId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Error deleting pin:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete pin' 
    }
  }
} 