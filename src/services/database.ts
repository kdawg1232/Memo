import { supabase } from './supabase'
import { 
  Pin, 
  CreatePinData, 
  User, 
  CreateUserData, 
  UpdateUserData,
  AudioPin,
  CreateAudioPinData
} from '../types/database'

// Re-export types for convenience so components can import from services/database
export type { AudioPin, CreateAudioPinData } from '../types/database'

// Database service for managing audio pins and user profiles
export class DatabaseService {
  // ===== USER PROFILE OPERATIONS =====
  
  /**
   * Get user profile by user ID
   * @param userId - The user ID to get profile for
   * @returns Promise with user profile or error
   */
  static async getUserProfile(userId: string): Promise<{ data: User | null; error: any }> {
    try {
      console.log('🔍 DatabaseService: Getting user profile for:', userId)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ DatabaseService: Error fetching user profile:', error.message)
        return { data: null, error }
      }

      console.log('✅ DatabaseService: User profile found:', data?.username)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception fetching user profile:', error)
      return { data: null, error }
    }
  }

  /**
   * Check if username is available
   * @param username - The username to check (will be converted to lowercase)
   * @param excludeUserId - Optional user ID to exclude from check (for updates)
   * @returns Promise with boolean indicating availability
   */
  static async isUsernameAvailable(username: string, excludeUserId?: string): Promise<{ available: boolean; error: any }> {
    try {
      const cleanUsername = username.toLowerCase().trim()
      console.log('🔍 DatabaseService: Checking username availability for:', cleanUsername)
      
      let query = supabase
        .from('users')
        .select('id')
        .eq('username', cleanUsername)

      if (excludeUserId) {
        query = query.neq('id', excludeUserId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ DatabaseService: Error checking username:', error.message)
        return { available: false, error }
      }

      const isAvailable = data.length === 0
      console.log(`${isAvailable ? '✅' : '❌'} DatabaseService: Username "${cleanUsername}" ${isAvailable ? 'available' : 'taken'}`)
      
      return { available: isAvailable, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception checking username:', error)
      return { available: false, error }
    }
  }

  /**
   * Update user profile
   * @param userId - The user ID to update
   * @param updateData - The fields to update
   * @returns Promise with updated user profile or error
   */
  static async updateUserProfile(userId: string, updateData: UpdateUserData): Promise<{ data: User | null; error: any }> {
    try {
      console.log('📝 DatabaseService: Updating user profile for:', userId)
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ DatabaseService: Error updating user profile:', error.message)
        return { data: null, error }
      }

      console.log('✅ DatabaseService: User profile updated successfully')
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception updating user profile:', error)
      return { data: null, error }
    }
  }

  /**
   * Search users by username (for friends feature)
   * @param searchTerm - The search term to look for
   * @param limit - Maximum number of results to return
   * @returns Promise with array of matching users
   */
  static async searchUsersByUsername(searchTerm: string, limit: number = 10): Promise<{ data: User[] | null; error: any }> {
    try {
      console.log('🔍 DatabaseService: Searching users with term:', searchTerm)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', `%${searchTerm.toLowerCase()}%`)
        .limit(limit)
        .order('username')

      if (error) {
        console.error('❌ DatabaseService: Error searching users:', error.message)
        return { data: null, error }
      }

      console.log(`✅ DatabaseService: Found ${data?.length || 0} users matching "${searchTerm}"`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception searching users:', error)
      return { data: null, error }
    }
  }

  /**
   * Get user by username to find their email for login
   * @param username - The username to look up
   * @returns Promise with user data or error
   */
  static async getUserByUsername(username: string): Promise<{ data: User | null; error: any }> {
    try {
      const cleanUsername = username.toLowerCase().trim()
      console.log('🔍 DatabaseService: Looking up user by username:', cleanUsername)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .single()

      if (error) {
        console.error('❌ DatabaseService: Error finding user by username:', error.message)
        return { data: null, error }
      }

      if (!data) {
        console.log('🚫 DatabaseService: No user found with username:', cleanUsername)
        return { data: null, error: new Error('User not found') }
      }

      console.log('✅ DatabaseService: Found user by username:', data.username)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception finding user by username:', error)
      return { data: null, error }
    }
  }

  /**
   * Get email address by username for authentication
   * This requires querying the auth.users table using the user ID from our users table
   * @param username - The username to look up
   * @returns Promise with email address or error
   */
  static async getEmailByUsername(username: string): Promise<{ email: string | null; error: any }> {
    try {
      const cleanUsername = username.toLowerCase().trim()
      console.log('🔍 DatabaseService: Getting email for username:', cleanUsername)
      
      // First get the user from our users table
      const { data: userProfile, error: profileError } = await DatabaseService.getUserByUsername(cleanUsername)
      
      if (profileError || !userProfile) {
        console.log('❌ DatabaseService: Username not found:', cleanUsername)
        return { email: null, error: profileError || new Error('Username not found') }
      }

      // Now we need to get the email from auth.users
      // Since we can't directly query auth.users from the client, we'll use a workaround
      // We'll create a database function to handle this
      const { data, error } = await supabase.rpc('get_user_email_by_id', {
        user_id: userProfile.id
      })

      if (error) {
        console.error('❌ DatabaseService: Error getting email by user ID:', error.message)
        // Fallback: return an error that suggests using email
        return { 
          email: null, 
          error: new Error('Unable to authenticate with username. Please use your email address to sign in.') 
        }
      }

      console.log('✅ DatabaseService: Found email for username')
      return { email: data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception getting email by username:', error)
      return { 
        email: null, 
        error: new Error('Unable to authenticate with username. Please use your email address to sign in.') 
      }
    }
  }

  // ===== PIN OPERATIONS =====
  
  /**
   * Create a new audio pin in the database
   * @param pinData - The pin data to create
   * @returns Promise with the created pin or error
   */
  static async createPin(pinData: CreatePinData): Promise<{ data: Pin | null; error: any }> {
    try {
      console.log('📍 DatabaseService: Creating new pin at:', pinData.lat, pinData.lng)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('❌ DatabaseService: No authenticated user')
        return { data: null, error: new Error('No authenticated user') }
      }

      const { data, error } = await supabase
        .from('pins')
        .insert([{
          user_id: user.id,
          ...pinData
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ DatabaseService: Error creating pin:', error.message)
        return { data: null, error }
      }

      console.log('✅ DatabaseService: Pin created successfully:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception creating pin:', error)
      return { data: null, error }
    }
  }

  /**
   * Get pins near a specific location
   * @param lat - Latitude center point
   * @param lng - Longitude center point  
   * @param radius - Search radius in degrees (approximately 0.01 = ~1km)
   * @returns Promise with array of nearby pins
   */
  static async getNearbyPins(
    lat: number, 
    lng: number, 
    radius: number = 0.01
  ): Promise<{ data: Pin[] | null; error: any }> {
    try {
      console.log(`🔍 DatabaseService: Getting pins near ${lat}, ${lng} within ${radius} radius`)
      
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .gte('lat', lat - radius)
        .lte('lat', lat + radius)
        .gte('lng', lng - radius)
        .lte('lng', lng + radius)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ DatabaseService: Error fetching nearby pins:', error.message)
        return { data: null, error }
      }

      console.log(`✅ DatabaseService: Found ${data?.length || 0} nearby pins`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception fetching nearby pins:', error)
      return { data: null, error }
    }
  }

  /**
   * Get all pins created by a specific user
   * @param userId - The user ID to get pins for
   * @returns Promise with array of user's pins
   */
  static async getUserPins(userId: string): Promise<{ data: Pin[] | null; error: any }> {
    try {
      console.log('🔍 DatabaseService: Getting pins for user:', userId)
      
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ DatabaseService: Error fetching user pins:', error.message)
        return { data: null, error }
      }

      console.log(`✅ DatabaseService: Found ${data?.length || 0} pins for user`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception fetching user pins:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a pin
   * @param pinId - The ID of the pin to delete
   * @returns Promise with error if any
   */
  static async deletePin(pinId: string): Promise<{ error: any }> {
    try {
      console.log('🗑️ DatabaseService: Deleting pin:', pinId)
      
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId)

      if (error) {
        console.error('❌ DatabaseService: Error deleting pin:', error.message)
        return { error }
      }

      console.log('✅ DatabaseService: Pin deleted successfully')
      return { error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception deleting pin:', error)
      return { error }
    }
  }
}

// ===== LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY =====
// These functions maintain the existing API while using the new class-based service

export const uploadAudioFile = async (
  audioUri: string,
  filename?: string
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    console.log('📤 Uploading audio file:', filename || 'unnamed')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'No authenticated user' }
    }

    // Generate filename if not provided
    const audioFilename = filename || `${Date.now()}.m4a`
    const filePath = `${user.id}/${audioFilename}`

    // Convert URI to blob for upload
    const response = await fetch(audioUri)
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()

    const { data, error } = await supabase.storage
      .from('audio')
      .upload(filePath, arrayBuffer, {
        contentType: 'audio/m4a',
        upsert: false
      })

    if (error) {
      console.error('❌ Upload error:', error.message)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath)

    console.log('✅ Audio uploaded successfully')
    return { success: true, audioUrl: publicUrl }
  } catch (error) {
    console.error('❌ Upload exception:', error)
    return { success: false, error: 'Failed to upload audio file' }
  }
}

export const createAudioPin = async (
  audioUri: string,
  pinData: CreateAudioPinData,
  filename?: string
): Promise<{ success: boolean; pin?: Pin; error?: string }> => {
  try {
    console.log('📍 Creating audio pin...')
    
    // First upload the audio file
    const uploadResult = await uploadAudioFile(audioUri, filename)
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error }
    }

    // Then create the pin with the audio URL
    const { data: pin, error } = await DatabaseService.createPin({
      ...pinData,
      audio_url: uploadResult.audioUrl!
    })

    if (error) {
      console.error('❌ Error creating pin:', error)
      return { success: false, error: 'Failed to create pin' }
    }

    console.log('✅ Audio pin created successfully')
    return { success: true, pin: pin! }
  } catch (error) {
    console.error('❌ Exception creating audio pin:', error)
    return { success: false, error: 'Failed to create audio pin' }
  }
}

export const fetchAudioPins = async (
  bounds?: {
    northEast: { lat: number; lng: number }
    southWest: { lat: number; lng: number }
  }
): Promise<{ success: boolean; pins?: Pin[]; error?: string }> => {
  try {
    if (bounds) {
      // Calculate center point and radius for location-based search
      const centerLat = (bounds.northEast.lat + bounds.southWest.lat) / 2
      const centerLng = (bounds.northEast.lng + bounds.southWest.lng) / 2
      const radius = Math.max(
        Math.abs(bounds.northEast.lat - bounds.southWest.lat),
        Math.abs(bounds.northEast.lng - bounds.southWest.lng)
      ) / 2

      const { data: pins, error } = await DatabaseService.getNearbyPins(centerLat, centerLng, radius)
      
      if (error) {
        return { success: false, error: 'Failed to fetch pins' }
      }

      return { success: true, pins: pins || [] }
    } else {
      // Fetch all pins (for initial load)
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) // Reasonable limit

      if (error) {
        console.error('❌ Error fetching pins:', error)
        return { success: false, error: 'Failed to fetch pins' }
      }

      return { success: true, pins: data || [] }
    }
  } catch (error) {
    console.error('❌ Exception fetching pins:', error)
    return { success: false, error: 'Failed to fetch pins' }
  }
}

export const fetchUserPins = async (): Promise<{ success: boolean; pins?: Pin[]; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'No authenticated user' }
    }

    const { data: pins, error } = await DatabaseService.getUserPins(user.id)
    
    if (error) {
      return { success: false, error: 'Failed to fetch user pins' }
    }

    return { success: true, pins: pins || [] }
  } catch (error) {
    console.error('❌ Exception fetching user pins:', error)
    return { success: false, error: 'Failed to fetch user pins' }
  }
}

export const deleteAudioPin = async (pinId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await DatabaseService.deletePin(pinId)
    
    if (error) {
      return { success: false, error: 'Failed to delete pin' }
    }

    return { success: true }
  } catch (error) {
    console.error('❌ Exception deleting pin:', error)
    return { success: false, error: 'Failed to delete pin' }
  }
} 