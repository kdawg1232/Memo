// Database types for Supabase schema
// These types ensure type safety when working with the database

// Pin database schema - represents audio pins on the map
export interface Pin {
  id: string
  user_id: string
  lat: number
  lng: number
  audio_url: string
  title?: string
  description?: string
  duration?: number  // Duration in seconds
  file_size?: number // File size in bytes
  created_at: string
  updated_at: string
}

// Backward compatibility alias for AudioPin
export type AudioPin = Pin

// Users database schema - represents user profiles
export interface User {
  id: string
  first_name: string
  last_name: string
  username: string
  profile_picture_url?: string | null
  created_at: string
  updated_at: string
}

// Groups database schema - represents user groups
export interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Group members database schema - represents group membership
export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined'
  role: 'member' | 'admin' | 'owner'
  invited_by?: string | null
  joined_at: string
  updated_at: string
}

// Extended type for group member with user details
export interface GroupMemberWithUser extends GroupMember {
  user: User
  invited_by_user?: User | null
}

// Extended type for group with member information
export interface GroupWithMembers extends Group {
  members: GroupMemberWithUser[]
  member_count: number
  created_by_user: User
}

// Group invitation data for creating new memberships
export interface GroupInvitationData {
  group_id: string
  user_id: string
  role?: 'member' | 'admin' | 'owner'
}

// Type for creating a new group
export interface CreateGroupData {
  name: string
  description?: string
}

// Type for updating a group
export interface UpdateGroupData {
  name?: string
  description?: string
}

// Type for searching users to invite
export interface UserSearchResult {
  id: string
  username: string
  first_name: string
  last_name: string
  profile_picture_url?: string | null
}

// Type for pending group invitations (to display in profile)
export interface PendingGroupInvitation {
  id: string
  group: Group
  invited_by_user: User
  joined_at: string
}

// Group pins database schema - represents pins shared to groups
export interface GroupPin {
  id: string
  group_id: string
  pin_id: string
  added_by_user_id: string
  added_at: string
}

// Extended type for group pin with pin and user details
export interface GroupPinWithDetails extends GroupPin {
  pin: Pin
  added_by_user: User
}

// Type for adding pins to groups
export interface AddPinToGroupsData {
  pin_id: string
  group_ids: string[]
}

// Type for creating a new pin (without auto-generated fields)
export interface CreatePin {
  user_id: string
  lat: number
  lng: number
  audio_url: string
  title?: string
  description?: string
  duration?: number
  file_size?: number
}

// Backward compatibility alias for CreateAudioPinData
export interface CreateAudioPinData {
  lat: number
  lng: number
  title?: string
  description?: string
  duration?: number
  file_size?: number
}

// Type for updating a pin (all fields optional except id)
export interface UpdatePin {
  id: string
  title?: string
  description?: string
  duration?: number
  file_size?: number
}

// Location type for GPS coordinates
export interface Location {
  lat: number
  lng: number
}

// Audio file metadata
export interface AudioMetadata {
  duration: number
  file_size: number
  format: string
  url: string
}

// Database response types
export interface DatabaseResponse<T> {
  data: T | null
  error: Error | null
}

// Query filters for finding nearby pins
export interface NearbyPinsQuery {
  lat: number
  lng: number
  radius: number // radius in meters
  limit?: number
}

// Database service interfaces
export interface CreatePinData {
  lat: number
  lng: number
  audio_url: string
  title?: string
  description?: string
  duration?: number
  file_size?: number
}

export interface CreateUserData {
  id: string // This will be the auth.users.id
  first_name: string
  last_name: string
  username: string
}

export interface UpdateUserData {
  first_name?: string
  last_name?: string
  username?: string
  profile_picture_url?: string | null
} 