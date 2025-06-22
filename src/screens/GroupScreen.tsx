import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native'
import { DatabaseService, GroupWithMembers, GroupPinWithDetails } from '../services/database'
import { useAuth } from '../hooks/useAuth'
import AudioPlaybackModal from '../components/AudioPlaybackModal'
import { supabase } from '../services/supabase'
import * as Location from 'expo-location'

interface GroupScreenProps {
  groupId: string
  onNavigateBack: () => void
  refreshTrigger?: number // Optional prop to trigger refresh
}

const GroupScreen: React.FC<GroupScreenProps> = ({ groupId, onNavigateBack, refreshTrigger }) => {
  const { user } = useAuth()
  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)

  // Group pins state
  const [groupPins, setGroupPins] = useState<GroupPinWithDetails[]>([])
  const [loadingPins, setLoadingPins] = useState(false)
  const [selectedPin, setSelectedPin] = useState<GroupPinWithDetails | null>(null)
  const [showAudioModal, setShowAudioModal] = useState(false)
  const [pinLocations, setPinLocations] = useState<{[pinId: string]: {address: string, city: string}}>({})  

  // Load group details when component mounts
  useEffect(() => {
    if (user?.id) {
      loadGroupDetails()
    }
  }, [groupId, user?.id])

  // Reload pins when refreshTrigger changes (e.g., after adding a pin)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Refresh trigger activated, reloading group pins...')
      loadGroupPins()
    }
  }, [refreshTrigger])

  // Set up real-time subscription for group pins changes
  useEffect(() => {
    if (!groupId) return

    console.log('🔄 Setting up real-time subscription for group pins...')

    // Subscribe to changes in group_pins table for this group
    const groupPinsSubscription = supabase
      .channel(`group_pins_${groupId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'group_pins',
          filter: `group_id=eq.${groupId}`
        }, 
        (payload) => {
          console.log('📡 Group pins change detected:', payload)
          console.log('🔄 Reloading group pins due to real-time update...')
          loadGroupPins() // Reload pins when any pin changes in this group
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up group pins subscription')
      groupPinsSubscription.unsubscribe()
    }
  }, [groupId])

  /**
   * Load detailed group information
   */
  const loadGroupDetails = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const { data: groupData, error } = await DatabaseService.getGroupById(groupId, user.id)
      
      if (error) {
        console.error('❌ Error loading group details:', error)
        Alert.alert('Error', 'Failed to load group details')
        return
      }

      if (groupData) {
        setGroup(groupData)
        console.log(`✅ Loaded group details: ${groupData.name}`)
        
        // Also load group pins
        await loadGroupPins()
      } else {
        Alert.alert('Error', 'Group not found')
      }
    } catch (error) {
      console.error('❌ Exception loading group details:', error)
      Alert.alert('Error', 'Failed to load group details')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load group pins
   */
  const loadGroupPins = async () => {
    try {
      setLoadingPins(true)
      console.log('🔍 Loading pins for group:', groupId)
      
      const { data: pinsData, error } = await DatabaseService.getGroupPins(groupId)
      
      if (error) {
        console.error('❌ Error loading group pins:', error)
        // Don't show alert for pins error, just log it
        return
      }

      if (pinsData) {
        setGroupPins(pinsData)
        console.log(`✅ Loaded ${pinsData.length} pins for group`)
        
        // Fetch location names for all pins
        console.log(`🗺️ Starting location fetching for ${pinsData.length} pins`)
        pinsData.forEach((groupPin, index) => {
          console.log(`📍 Processing pin ${index + 1}/${pinsData.length}: ${groupPin.pin.id}`)
          getLocationName(groupPin.pin.lat, groupPin.pin.lng, groupPin.pin.id)
        })
      }
    } catch (error) {
      console.error('❌ Exception loading group pins:', error)
    } finally {
      setLoadingPins(false)
    }
  }

  /**
   * Get location name from coordinates using reverse geocoding
   */
  const getLocationName = async (lat: number, lng: number, pinId: string) => {
    try {
      console.log(`🗺️ Getting location for pin ${pinId}: lat=${lat}, lng=${lng}`)
      
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      console.log('📍 Reverse geocode result:', result)
      
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
        
        const address = addressParts.length > 0 ? addressParts.join(' ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        const city = cityStateParts.length > 0 ? cityStateParts.join(', ') : ''
        
        console.log(`✅ Location parsed - Address: "${address}", City: "${city}"`)
        
        setPinLocations(prev => ({
          ...prev,
          [pinId]: { address, city }
        }))
      } else {
        console.log('⚠️ No location data returned')
        const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        setPinLocations(prev => ({
          ...prev,
          [pinId]: { address: coords, city: '' }
        }))
      }
    } catch (error) {
      console.error('❌ Error getting location name:', error)
      const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      setPinLocations(prev => ({
        ...prev,
        [pinId]: { address: coords, city: '' }
      }))
    }
  }

  /**
   * Format creation date
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return 'Unknown date'
    }
  }

  /**
   * Get member role display text
   */
  const getRoleDisplayText = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'Owner'
      case 'admin':
        return '⭐ Admin'
      case 'member':
        return '👤 Member'
      default:
        return '👤 Member'
    }
  }

  /**
   * Handle opening invite modal
   */
  const handleInvitePress = () => {
    setInviteUsername('')
    setShowInviteModal(true)
  }

  /**
   * Handle closing invite modal
   */
  const handleCancelInvite = () => {
    setShowInviteModal(false)
    setInviteUsername('')
  }

  /**
   * Handle sending invitation
   */
  const handleSendInvite = async () => {
    if (!inviteUsername.trim()) {
      Alert.alert('Error', 'Please enter a username')
      return
    }

    if (!user?.id || !group) {
      Alert.alert('Error', 'Unable to send invitation')
      return
    }

    try {
      setInviting(true)

      // First, search for the user by username
      const { data: foundUser, error: searchError } = await DatabaseService.getUserByUsername(inviteUsername.trim())
      
      if (searchError) {
        console.error('❌ Error searching for user:', searchError)
        Alert.alert('Error', 'Failed to search for user')
        return
      }

      if (!foundUser) {
        Alert.alert('User Not Found', `No user found with username "${inviteUsername.trim()}"`)
        return
      }

      // Check if user is already a member
      const isAlreadyMember = group.members.some(member => member.user_id === foundUser.id)
      if (isAlreadyMember) {
        Alert.alert('Already a Member', `${foundUser.username} is already a member of this group`)
        return
      }

      // Send the invitation
      const { error: inviteError } = await DatabaseService.addGroupMember({
        group_id: group.id,
        user_id: foundUser.id,
        role: 'member'
      })

      if (inviteError) {
        console.error('❌ Error sending invitation:', inviteError)
        Alert.alert('Error', 'Failed to send invitation')
        return
      }

      Alert.alert(
        'Invitation Sent!', 
        `Invitation sent to ${foundUser.username}`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setShowInviteModal(false)
              setInviteUsername('')
              // Reload group details to show pending invitation
              loadGroupDetails()
            }
          }
        ]
      )
    } catch (error) {
      console.error('❌ Exception sending invitation:', error)
      Alert.alert('Error', 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  /**
   * Check if current user can invite others (owner or admin)
   */
  const canInviteUsers = () => {
    if (!user?.id || !group) return false
    
    // Check if user is the creator
    if (group.created_by === user.id) return true
    
    // Check if user has owner or admin role
    const userMembership = group.members.find(member => member.user_id === user.id)
    return userMembership?.role === 'owner' || userMembership?.role === 'admin'
  }

  /**
   * Handle pin press for audio playback
   */
  const handlePinPress = (pin: GroupPinWithDetails) => {
    console.log('🎵 Group pin pressed:', pin.pin.id)
    setSelectedPin(pin)
    setShowAudioModal(true)
  }

  /**
   * Handle audio modal close
   */
  const handleAudioModalClose = () => {
    console.log('❌ Audio modal closed')
    setSelectedPin(null)
    setShowAudioModal(false)
  }

  /**
   * Handle pin deletion (only for pin creator or group admin/owner)
   */
  const handlePinDelete = async (pin: GroupPinWithDetails) => {
    if (!user?.id) return

    try {
      console.log('🗑️ Deleting group pin:', pin.pin.id)
      
      const { error } = await DatabaseService.removeGroupPin(groupId, pin.pin.id)
      
      if (error) {
        console.error('❌ Error deleting group pin:', error)
        Alert.alert('Error', 'Failed to delete pin')
        return
      }

      // Remove pin from local state
      setGroupPins(prevPins => prevPins.filter(p => p.pin.id !== pin.pin.id))
      
      console.log('✅ Group pin deleted successfully')
      Alert.alert('Success', 'Pin removed from group')
    } catch (error) {
      console.error('❌ Exception deleting group pin:', error)
      Alert.alert('Error', 'Failed to delete pin')
    }
  }

  /**
   * Check if user can delete a pin (pin creator, group admin, or group owner)
   */
  const canDeletePin = (pin: GroupPinWithDetails) => {
    if (!user?.id || !group) return false
    
    // Pin creator can delete their own pin
    if (pin.added_by === user.id) return true
    
    // Group owner can delete any pin
    if (group.created_by === user.id) return true
    
    // Group admin can delete any pin
    const userMembership = group.members.find(member => member.user_id === user.id)
    return userMembership?.role === 'admin' || userMembership?.role === 'owner'
  }

  /**
   * Format pin creation date
   */
  const formatPinDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffHours < 1) {
        return 'Just now'
      } else if (diffHours < 24) {
        return `${diffHours}h ago`
      } else if (diffDays < 7) {
        return `${diffDays}d ago`
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    } catch (error) {
      return 'Unknown'
    }
  }

  /**
   * Render member item
   */
  const renderMember = (member: any, index: number) => (
    <View key={member.id || index} style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.user.first_name} {member.user.last_name}
        </Text>
        <Text style={styles.memberUsername}>@{member.user.username}</Text>
      </View>
      <Text style={styles.memberRole}>{getRoleDisplayText(member.role)}</Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Loading State */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading group details...</Text>
        </View>
      </View>
    )
  }

  if (!group) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Error State */}
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Group Not Found</Text>
          <Text style={styles.errorDescription}>
            This group may have been deleted or you may no longer have access to it.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={onNavigateBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const acceptedMembers = group.members.filter(member => member.status === 'accepted')

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Group Info Section */}
          <View style={styles.groupInfoSection}>
            <Text style={styles.groupName}>{group.name}</Text>
            
            {group.description && (
              <Text style={styles.groupDescription}>{group.description}</Text>
            )}
            
            <View style={styles.groupStats}>
              <Text style={styles.statItem}>
                {acceptedMembers.length} member{acceptedMembers.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.statSeparator}>•</Text>
              <Text style={styles.statItem}>Created {formatDate(group.created_at)}</Text>
            </View>
          </View>

          {/* Members Section */}
          <View style={styles.membersSection}>
            <View style={styles.membersSectionHeader}>
              <Text style={styles.sectionTitle}>Members ({acceptedMembers.length})</Text>
              {canInviteUsers() && (
                <TouchableOpacity 
                  style={styles.inviteButton}
                  onPress={handleInvitePress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.inviteButtonText}>Invite Users</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {acceptedMembers.length > 0 ? (
              <View style={styles.membersList}>
                {acceptedMembers.map((member, index) => renderMember(member, index))}
              </View>
            ) : (
              <View style={styles.emptyMembersState}>
                <Text style={styles.emptyMembersText}>No members yet</Text>
              </View>
            )}
          </View>

          {/* Group Pins Section */}
          <View style={styles.pinsSection}>
            <View style={styles.pinsSectionHeader}>
              <Text style={styles.sectionTitle}>Shared Audio Pins ({groupPins.length})</Text>
            </View>
            
            {loadingPins ? (
              <View style={styles.loadingPinsContainer}>
                <ActivityIndicator size="small" color="#000000" />
                <Text style={styles.loadingPinsText}>Loading pins...</Text>
              </View>
            ) : groupPins.length > 0 ? (
              <View style={styles.pinsList}>
                {groupPins.map((groupPin, index) => {
                  const location = pinLocations[groupPin.pin.id]
                  return (
                    <TouchableOpacity
                      key={groupPin.pin.id}
                      style={styles.pinItem}
                      onPress={() => handlePinPress(groupPin)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pinContent}>
                        <View style={styles.pinMainInfo}>
                          <Text style={styles.pinLocationName}>
                            {location?.address || 'Loading address...'}
                          </Text>
                          <Text style={styles.pinLocationSubtitle}>
                            {location?.city || 'Loading city...'}
                          </Text>
                          <View style={styles.pinMetadata}>
                            <Text style={styles.pinTimestamp}>
                              {formatPinDate(groupPin.pin.created_at)} • {Math.floor(groupPin.pin.duration / 60)}:{(groupPin.pin.duration % 60).toString().padStart(2, '0')}
                            </Text>
                          </View>
                          <Text style={styles.pinSharedBy}>
                            Shared by {groupPin.user.first_name} {groupPin.user.last_name}
                          </Text>
                        </View>
                        
                        <View style={styles.pinActions}>
                          <TouchableOpacity
                            style={styles.playButton}
                            onPress={() => handlePinPress(groupPin)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Text style={styles.playButtonIcon}>▶</Text>
                          </TouchableOpacity>
                          
                          {canDeletePin(groupPin) && (
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handlePinDelete(groupPin)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Text style={styles.deleteButtonText}>🗑️</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ) : (
              <View style={styles.emptyPinsState}>
                <Text style={styles.emptyPinsTitle}>No audio pins yet</Text>
                <Text style={styles.emptyPinsDescription}>
                  Group members can share voice memos here by recording them on the map and selecting this group.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelInvite}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancelInvite} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invite User</Text>
            <TouchableOpacity 
              onPress={handleSendInvite} 
              style={[styles.modalSendButton, (!inviteUsername.trim() || inviting) && styles.modalSendButtonDisabled]}
              disabled={!inviteUsername.trim() || inviting}
            >
              <Text style={[styles.modalSendButtonText, (!inviteUsername.trim() || inviting) && styles.modalSendButtonTextDisabled]}>
                {inviting ? 'Sending...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Username</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter username to invite"
              value={inviteUsername}
              onChangeText={setInviteUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
              returnKeyType="send"
              onSubmitEditing={handleSendInvite}
              editable={!inviting}
            />
            <Text style={styles.modalHint}>
              Enter the exact username of the person you want to invite to this group.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Audio Playback Modal */}
      {selectedPin && (
        <AudioPlaybackModal
          visible={showAudioModal}
          audioPin={{
            id: selectedPin.pin.id,
            user_id: selectedPin.pin.user_id,
            lat: selectedPin.pin.lat,
            lng: selectedPin.pin.lng,
            audio_url: selectedPin.pin.audio_url,
            title: selectedPin.pin.title,
            description: selectedPin.pin.description,
            duration: selectedPin.pin.duration,
            file_size: selectedPin.pin.file_size,
            created_at: selectedPin.pin.created_at,
            updated_at: selectedPin.pin.updated_at
          }}
          onClose={handleAudioModalClose}
          onDelete={() => {
            handlePinDelete(selectedPin)
            handleAudioModalClose()
          }}
          canDelete={canDeletePin(selectedPin)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#808080',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  groupInfoSection: {
    marginBottom: 32,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 16,
    color: '#404040',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  groupStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    fontSize: 14,
    color: '#808080',
  },
  statSeparator: {
    fontSize: 14,
    color: '#808080',
    marginHorizontal: 8,
  },
  membersSection: {
    marginBottom: 20,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  inviteButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 14,
    color: '#808080',
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '500',
    color: '#404040',
  },
  emptyMembersState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMembersText: {
    fontSize: 16,
    color: '#808080',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalCancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  modalCancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  modalSendButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalSendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSendButtonTextDisabled: {
    color: '#888888',
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  modalHint: {
    fontSize: 14,
    color: '#808080',
    lineHeight: 20,
  },
  pinsSection: {
    marginBottom: 20,
  },
  pinsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingPinsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingPinsText: {
    marginTop: 16,
    fontSize: 16,
    color: '#808080',
  },
  pinsList: {
    gap: 12,
  },
  pinItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pinContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinMainInfo: {
    flex: 1,
  },
  pinLocationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  pinLocationSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  pinMetadata: {
    marginBottom: 4,
  },
  pinTimestamp: {
    fontSize: 14,
    color: '#666666',
  },
  pinSharedBy: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  pinActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyPinsState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPinsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  emptyPinsDescription: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default GroupScreen 