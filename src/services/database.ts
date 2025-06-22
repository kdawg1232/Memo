import { supabase } from './supabase'
import { 
  Pin, 
  CreatePinData, 
  User, 
  CreateUserData, 
  UpdateUserData,
  AudioPin,
  CreateAudioPinData,
  Group,
  GroupMember,
  GroupMemberWithUser,
  GroupWithMembers,
  CreateGroupData,
  UpdateGroupData,
  GroupInvitationData,
  UserSearchResult,
  PendingGroupInvitation
} from '../types/database'

// Re-export types for convenience so components can import from services/database
export type { 
  AudioPin, 
  CreateAudioPinData,
  Group,
  GroupMember,
  GroupMemberWithUser,
  GroupWithMembers,
  CreateGroupData,
  UpdateGroupData,
  GroupInvitationData,
  UserSearchResult,
  PendingGroupInvitation
} from '../types/database'

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

  /**
   * Upload profile picture to storage and update user profile
   * @param userId - The user ID
   * @param imageUri - The local image URI
   * @returns Promise with updated profile or error
   */
  static async uploadProfilePicture(userId: string, imageUri: string): Promise<{ data: User | null; error: any }> {
    try {
      console.log('📸 DatabaseService: Uploading profile picture for user:', userId)

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${userId}/profile-${timestamp}.jpg`

      // Convert URI to blob
      const response = await fetch(imageUri)
      const blob = await response.blob()

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ DatabaseService: Error uploading profile picture:', uploadError.message)
        return { data: null, error: uploadError }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filename)

      console.log('✅ DatabaseService: Profile picture uploaded, URL:', publicUrl)

      // Update user profile with new picture URL
      const { data: userData, error: updateError } = await DatabaseService.updateUserProfile(userId, {
        profile_picture_url: publicUrl
      })

      if (updateError) {
        console.error('❌ DatabaseService: Error updating profile with picture URL:', updateError.message)
        // Clean up uploaded file if profile update failed
        await supabase.storage.from('profile-pictures').remove([filename])
        return { data: null, error: updateError }
      }

      console.log('✅ DatabaseService: Profile picture updated successfully')
      return { data: userData, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception uploading profile picture:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete profile picture from storage and update user profile
   * @param userId - The user ID
   * @param profilePictureUrl - The current profile picture URL to delete
   * @returns Promise with updated profile or error
   */
  static async deleteProfilePicture(userId: string, profilePictureUrl: string): Promise<{ data: User | null; error: any }> {
    try {
      console.log('🗑️ DatabaseService: Deleting profile picture for user:', userId)

      // Extract filename from URL
      const urlParts = profilePictureUrl.split('/')
      const filename = urlParts[urlParts.length - 1]
      const fullPath = `${userId}/${filename}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('profile-pictures')
        .remove([fullPath])

      if (deleteError) {
        console.error('❌ DatabaseService: Error deleting profile picture from storage:', deleteError.message)
        // Continue with profile update even if storage deletion fails
      }

      // Update user profile to remove picture URL
      const { data: userData, error: updateError } = await DatabaseService.updateUserProfile(userId, {
        profile_picture_url: null
      })

      if (updateError) {
        console.error('❌ DatabaseService: Error removing picture URL from profile:', updateError.message)
        return { data: null, error: updateError }
      }

      console.log('✅ DatabaseService: Profile picture deleted successfully')
      return { data: userData, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception deleting profile picture:', error)
      return { data: null, error }
    }
  }

  // ===== GROUP OPERATIONS =====

  /**
   * Create a new group
   * @param groupData - The group data to create
   * @returns Promise with created group or error
   */
  static async createGroup(groupData: CreateGroupData): Promise<{ data: Group | null; error: any }> {
    try {
      console.log('🆕 DatabaseService: Creating group:', groupData.name)
      
      // Get current user ID for RLS policy compliance
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ DatabaseService: User not authenticated for group creation')
        console.error('❌ Auth error details:', authError)
        return { data: null, error: authError || new Error('User not authenticated') }
      }

      console.log('👤 DatabaseService: Current user ID:', user.id)
      console.log('👤 DatabaseService: User email:', user.email)
      console.log('👤 DatabaseService: User role:', user.role)
      console.log('👤 DatabaseService: Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No')

      // Debug: Test auth.uid() function directly
      const { data: testAuthUid, error: testError } = await supabase.rpc('test_auth_uid')
      console.log('🔍 DatabaseService: Direct auth.uid() test:', testAuthUid, testError)

      const insertData = {
        name: groupData.name.trim(),
        description: groupData.description?.trim() || null,
        created_by: user.id  // ✅ Explicitly set created_by for RLS policy
      }
      
      console.log('📋 DatabaseService: Insert data:', insertData)

      const { data, error } = await supabase
        .from('groups')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('❌ DatabaseService: Error creating group:', error.message)
        console.error('❌ Error details:', error)
        console.error('❌ Error code:', error.code)
        console.error('❌ Error hint:', error.hint)
        console.error('❌ Error details object:', JSON.stringify(error, null, 2))
        return { data: null, error }
      }

      console.log('✅ DatabaseService: Group created successfully:', data.name)
      console.log('✅ DatabaseService: Created group data:', data)
      console.log('🔧 DatabaseService: Auto-owner trigger will add creator as owner')
      
      // Note: The auto_add_group_owner trigger will automatically add the creator as owner
      // No need to manually call addGroupMember here

      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception creating group:', error)
      console.error('❌ Exception details:', JSON.stringify(error, null, 2))
      return { data: null, error }
    }
  }

  /**
   * Get groups that the user belongs to (including groups they created and are owners of)
   * @param userId - The user ID to get groups for
   * @returns Promise with array of groups or error
   */
  static async getUserGroups(userId: string): Promise<{ data: GroupWithMembers[] | null; error: any }> {
    try {
      console.log('🔍 DatabaseService: Getting groups for user:', userId)
      
      // Step 1: Get groups where user is EITHER:
      // - An accepted member OR
      // - The group creator (since auto-owner trigger makes them owner with accepted status)
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role, status')
        .eq('user_id', userId)
        .eq('status', 'accepted') // Only accepted memberships

      if (membershipError) {
        console.error('❌ DatabaseService: Error fetching user memberships:', membershipError.message)
        return { data: null, error: membershipError }
      }

      // Also get groups created by this user (fallback in case auto-owner didn't work)
      const { data: createdGroups, error: createdGroupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('created_by', userId)

      if (createdGroupsError) {
        console.error('❌ DatabaseService: Error fetching created groups:', createdGroupsError.message)
        return { data: null, error: createdGroupsError }
      }

      // Combine group IDs from memberships and created groups
      const memberGroupIds = membershipData?.map(m => m.group_id) || []
      const createdGroupIds = createdGroups?.map(g => g.id) || []
      const allGroupIds = [...new Set([...memberGroupIds, ...createdGroupIds])] // Remove duplicates

      if (allGroupIds.length === 0) {
        console.log('✅ DatabaseService: User has no groups')
        return { data: [], error: null }
      }

      console.log(`📊 DatabaseService: User has ${allGroupIds.length} groups (${memberGroupIds.length} memberships + ${createdGroupIds.length} created)`)

      const groupIds = allGroupIds

      // Step 2: Get full group details for those groups (bypassing RLS by not filtering)
      // We use the bypass RLS approach by directly querying with the known IDs
      const { data: allGroups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)

      if (groupsError) {
        console.error('❌ DatabaseService: Error fetching group details:', groupsError.message)
        return { data: null, error: groupsError }
      }

      // Step 3: Get all members for these groups
      const { data: allMembers, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .in('group_id', groupIds)

      if (membersError) {
        console.error('❌ DatabaseService: Error fetching group members:', membersError.message)
        return { data: null, error: membersError }
      }

      // Step 4: Get user details for all relevant users (creators and members)
      const userIds = new Set<string>()
      allGroups?.forEach(group => userIds.add(group.created_by))
      allMembers?.forEach(member => {
        userIds.add(member.user_id)
        if (member.invited_by) userIds.add(member.invited_by)
      })

      // Try to fetch users with profile_picture_url, fallback without it if column doesn't exist
      let { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, profile_picture_url')
        .in('id', Array.from(userIds))

      // If profile_picture_url column doesn't exist, retry without it
      if (usersError && usersError.code === '42703') {
        console.log('⚠️ profile_picture_url column not found, retrying without it...')
        const { data, error } = await supabase
          .from('users')
          .select('id, username, first_name, last_name')
          .in('id', Array.from(userIds))
        // Add missing profile_picture_url field with null values for backward compatibility
        allUsers = data?.map(user => ({ ...user, profile_picture_url: null })) || null
        usersError = error
      }

      if (usersError) {
        console.error('❌ DatabaseService: Error fetching user details:', usersError.message)
        return { data: null, error: usersError }
      }

      // Create a user lookup map for efficient data joining
      const userMap = new Map(allUsers?.map(user => [user.id, user]) || [])

      // Step 5: Combine the data with manual joins
      const groupsWithMembers = allGroups?.map(group => {
        const groupMembers = allMembers?.filter(member => member.group_id === group.id) || []
        
        // Add user data to each member
        const membersWithUserData = groupMembers.map(member => ({
          ...member,
          user: userMap.get(member.user_id) || null,
          invited_by_user: member.invited_by ? userMap.get(member.invited_by) || null : null
        }))

        return {
          ...group,
          created_by_user: userMap.get(group.created_by) || null,
          members: membersWithUserData,
          member_count: membersWithUserData.filter(member => member.status === 'accepted').length
        }
      }) || []

      console.log(`✅ DatabaseService: Found ${groupsWithMembers.length} groups for user`)
      return { data: groupsWithMembers, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception fetching user groups:', error)
      return { data: null, error }
    }
  }

  /**
   * Get a specific group by ID with all its details
   * @param groupId - The group ID to fetch
   * @param userId - The user ID making the request (for permission checking)
   * @returns Promise with group details or error
   */
  static async getGroupById(groupId: string, userId: string): Promise<{ data: GroupWithMembers | null; error: any }> {
    try {
      console.log('🔍 DatabaseService: Getting group by ID:', groupId)
      
      // First check if user has access to this group (is a member)
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('❌ DatabaseService: Error checking group membership:', membershipError.message)
        return { data: null, error: membershipError }
      }

      // Also check if user created the group (as fallback)
      const { data: groupOwnerCheck, error: ownerError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .eq('created_by', userId)
        .single()

      if (ownerError && ownerError.code !== 'PGRST116') {
        console.error('❌ DatabaseService: Error checking group ownership:', ownerError.message)
      }

      // If user is neither a member nor the creator, deny access
      if (!membershipData && !groupOwnerCheck) {
        console.log('❌ DatabaseService: User does not have access to this group')
        return { data: null, error: new Error('Access denied') }
      }

      // Get group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) {
        console.error('❌ DatabaseService: Error fetching group:', groupError.message)
        return { data: null, error: groupError }
      }

      // Get all members for this group
      const { data: allMembers, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)

      if (membersError) {
        console.error('❌ DatabaseService: Error fetching group members:', membersError.message)
        return { data: null, error: membersError }
      }

      // Get user details for all relevant users (creator and members)
      const userIds = new Set<string>()
      userIds.add(groupData.created_by)
      allMembers?.forEach(member => {
        userIds.add(member.user_id)
        if (member.invited_by) userIds.add(member.invited_by)
      })

      // Try to fetch users with profile_picture_url, fallback without it if column doesn't exist
      let { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, profile_picture_url')
        .in('id', Array.from(userIds))

      // If profile_picture_url column doesn't exist, retry without it
      if (usersError && usersError.code === '42703') {
        console.log('⚠️ profile_picture_url column not found in getGroupById, retrying without it...')
        const { data, error } = await supabase
          .from('users')
          .select('id, username, first_name, last_name')
          .in('id', Array.from(userIds))
        // Add missing profile_picture_url field with null values for backward compatibility
        allUsers = data?.map(user => ({ ...user, profile_picture_url: null })) || null
        usersError = error
      }

      if (usersError) {
        console.error('❌ DatabaseService: Error fetching user details:', usersError.message)
        return { data: null, error: usersError }
      }

      // Create a user lookup map for efficient data joining
      const userMap = new Map(allUsers?.map(user => [user.id, user]) || [])

      // Combine the data with manual joins
      const groupMembers = allMembers || []
      
      // Add user data to each member
      const membersWithUserData = groupMembers.map(member => ({
        ...member,
        user: userMap.get(member.user_id) || null,
        invited_by_user: member.invited_by ? userMap.get(member.invited_by) || null : null
      }))

      const groupWithMembers: GroupWithMembers = {
        ...groupData,
        created_by_user: userMap.get(groupData.created_by) || null,
        members: membersWithUserData,
        member_count: membersWithUserData.filter(member => member.status === 'accepted').length
      }

      console.log(`✅ DatabaseService: Found group: ${groupWithMembers.name}`)
      return { data: groupWithMembers, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception fetching group by ID:', error)
      return { data: null, error }
    }
  }

  /**
   * Search users to invite to a group (excludes current members)
   * @param searchTerm - The search term to look for
   * @param groupId - The group ID to exclude current members from
   * @param limit - Maximum number of results to return
   * @returns Promise with array of matching users
   */
  static async searchUsersForGroupInvite(
    searchTerm: string, 
    groupId: string, 
    limit: number = 10
  ): Promise<{ data: UserSearchResult[] | null; error: any }> {
    try {
      console.log('🔍 DatabaseService: Searching users for group invite:', searchTerm)
      
      // First get current group members to exclude them
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)

      if (membersError) {
        console.error('❌ DatabaseService: Error fetching group members:', membersError.message)
        return { data: null, error: membersError }
      }

      const memberIds = members?.map(m => m.user_id) || []

      // Search for users excluding current members
      let query = supabase
        .from('users')
        .select('id, username, first_name, last_name, profile_picture_url')
        .ilike('username', `%${searchTerm.toLowerCase()}%`)
        .limit(limit)
        .order('username')

      if (memberIds.length > 0) {
        query = query.not('id', 'in', `(${memberIds.join(',')})`)
      }

      let { data, error } = await query

      // If profile_picture_url column doesn't exist, retry without it
      if (error && error.code === '42703') {
        console.log('⚠️ profile_picture_url column not found in search, retrying without it...')
        let fallbackQuery = supabase
          .from('users')
          .select('id, username, first_name, last_name')
          .ilike('username', `%${searchTerm.toLowerCase()}%`)
          .limit(limit)
          .order('username')

        if (memberIds.length > 0) {
          fallbackQuery = fallbackQuery.not('id', 'in', `(${memberIds.join(',')})`)
        }

        const queryResult = await fallbackQuery
        // Add missing profile_picture_url field with null values for backward compatibility
        data = queryResult.data?.map(user => ({ ...user, profile_picture_url: null })) || null
        error = queryResult.error
      }

      if (error) {
        console.error('❌ DatabaseService: Error searching users for invite:', error.message)
        return { data: null, error }
      }

      console.log(`✅ DatabaseService: Found ${data?.length || 0} users for group invite`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception searching users for invite:', error)
      return { data: null, error }
    }
  }

  /**
   * Add a user to a group (send invitation)
   * @param invitationData - The invitation data
   * @returns Promise with created group member or error
   */
  static async addGroupMember(invitationData: GroupInvitationData): Promise<{ data: GroupMember | null; error: any }> {
    try {
      console.log('📨 DatabaseService: Adding group member:', invitationData)
      
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: invitationData.group_id,
          user_id: invitationData.user_id,
          role: invitationData.role || 'member',
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ DatabaseService: Error adding group member:', error.message)
        return { data: null, error }
      }

      console.log('✅ DatabaseService: Group invitation sent successfully')
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception adding group member:', error)
      return { data: null, error }
    }
  }

  /**
   * Get pending group invitations for a user
   * @param userId - The user ID to get invitations for
   * @returns Promise with array of pending invitations or error
   */
  static async getPendingGroupInvitations(userId: string): Promise<{ data: PendingGroupInvitation[] | null; error: any }> {
    try {
      console.log('🔍 DatabaseService: Getting pending invitations for user:', userId)
      
      // Get pending group invitations with manual joins to avoid foreign key issues
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('id, group_id, invited_by, joined_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: false })

      if (membershipError) {
        console.error('❌ DatabaseService: Error fetching pending memberships:', membershipError.message)
        return { data: null, error: membershipError }
      }

      if (!membershipData || membershipData.length === 0) {
        console.log('✅ DatabaseService: No pending invitations')
        return { data: [], error: null }
      }

      // Get group details
      const groupIds = membershipData.map(m => m.group_id)
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, description, created_by, created_at, updated_at')
        .in('id', groupIds)

      if (groupsError) {
        console.error('❌ DatabaseService: Error fetching group details:', groupsError.message)
        return { data: null, error: groupsError }
      }

      // Get invited_by user details
      const inviterIds = membershipData.map(m => m.invited_by).filter(Boolean)
      let inviterData: any[] = []
      if (inviterIds.length > 0) {
        // Try with profile_picture_url first, fallback without it
        let { data, error } = await supabase
          .from('users')
          .select('id, username, first_name, last_name, profile_picture_url')
          .in('id', inviterIds)

        if (error && error.code === '42703') {
          console.log('⚠️ profile_picture_url column not found in invitations, retrying without it...')
          const fallbackResult = await supabase
            .from('users')
            .select('id, username, first_name, last_name')
            .in('id', inviterIds)
          data = fallbackResult.data?.map(user => ({ ...user, profile_picture_url: null })) || null
          error = fallbackResult.error
        }

        if (error) {
          console.error('❌ DatabaseService: Error fetching inviter details:', error.message)
          return { data: null, error }
        }
        inviterData = data || []
      }

      // Create lookup maps
      const groupMap = new Map(groupsData?.map(g => [g.id, g]) || [])
      const inviterMap = new Map(inviterData.map(u => [u.id, u]))

            // Transform the data to match PendingGroupInvitation interface
      const transformedData: PendingGroupInvitation[] = membershipData.map(item => ({
        id: item.id,
        group: groupMap.get(item.group_id)!,  // We know it exists since we fetched it
        invited_by_user: item.invited_by ? inviterMap.get(item.invited_by) || null : null,
        joined_at: item.joined_at
      }))

      console.log(`✅ DatabaseService: Found ${transformedData.length} pending invitations`)
      return { data: transformedData, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception fetching pending invitations:', error)
      return { data: null, error }
    }
  }

  /**
   * Accept or decline a group invitation
   * @param membershipId - The group membership ID
   * @param status - The new status ('accepted' or 'declined')
   * @returns Promise with updated group member or error
   */
  static async respondToGroupInvitation(
    membershipId: string, 
    status: 'accepted' | 'declined'
  ): Promise<{ data: GroupMember | null; error: any }> {
    try {
      console.log(`📝 DatabaseService: ${status === 'accepted' ? 'Accepting' : 'Declining'} group invitation:`, membershipId)
      
      const { data, error } = await supabase
        .from('group_members')
        .update({ status })
        .eq('id', membershipId)
        .select()
        .single()

      if (error) {
        console.error('❌ DatabaseService: Error responding to invitation:', error.message)
        return { data: null, error }
      }

      console.log(`✅ DatabaseService: Group invitation ${status} successfully`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception responding to invitation:', error)
      return { data: null, error }
    }
  }

  /**
   * Leave a group or remove a member
   * @param membershipId - The group membership ID to remove
   * @returns Promise with success/error status
   */
  static async removeGroupMember(membershipId: string): Promise<{ error: any }> {
    try {
      console.log('🚪 DatabaseService: Removing group member:', membershipId)
      
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', membershipId)

      if (error) {
        console.error('❌ DatabaseService: Error removing group member:', error.message)
        return { error }
      }

      console.log('✅ DatabaseService: Group member removed successfully')
      return { error: null }
    } catch (error) {
      console.error('❌ DatabaseService: Exception removing group member:', error)
      return { error }
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
    
    // Use FileReader for React Native compatibility
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(blob)
    })

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