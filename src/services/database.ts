import { supabase } from './supabase'
import { Pin, CreatePin, UpdatePin, NearbyPinsQuery, DatabaseResponse } from '../types/database'

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