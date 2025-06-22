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
import { DatabaseService, GroupWithMembers } from '../services/database'
import { useAuth } from '../hooks/useAuth'

interface GroupScreenProps {
  groupId: string
  onNavigateBack: () => void
}

const GroupScreen: React.FC<GroupScreenProps> = ({ groupId, onNavigateBack }) => {
  const { user } = useAuth()
  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)

  // Load group details when component mounts
  useEffect(() => {
    if (user?.id) {
      loadGroupDetails()
    }
  }, [groupId, user?.id])

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
})

export default GroupScreen 