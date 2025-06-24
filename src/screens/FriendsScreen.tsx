import React, { useState, useEffect, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { DatabaseService, GroupWithMembers, PendingGroupInvitation } from '../services/database'
import { supabase } from '../services/supabase'

interface FriendsScreenProps {
  onNavigateBack: () => void
  onNavigateToCreateGroup: () => void
  onNavigateToGroup: (groupId: string) => void
  refreshTrigger?: number
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onNavigateBack, onNavigateToCreateGroup, onNavigateToGroup, refreshTrigger }) => {
  const { user } = useAuth()
  const [userGroups, setUserGroups] = useState<GroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<PendingGroupInvitation[]>([])
  const [showInvitesModal, setShowInvitesModal] = useState(false)

  /**
   * Load user's groups from database
   */
  const loadUserGroups = useCallback(async (showRefreshSpinner = false) => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      if (showRefreshSpinner) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const { data, error } = await DatabaseService.getUserGroups(user.id)
      
      if (error) {
        console.error('❌ Error loading user groups:', error)
        if (!showRefreshSpinner) {
          Alert.alert('Error', 'Failed to load groups')
        }
        return
      }

      if (data) {
        setUserGroups(data)
        console.log(`✅ Loaded ${data.length} groups for user`)
        
        // Log group details for debugging
        data.forEach(group => {
          console.log(`📋 Group: ${group.name} (${group.member_count} members)`)
        })
      }
    } catch (error) {
      console.error('❌ Exception loading user groups:', error)
      if (!showRefreshSpinner) {
        Alert.alert('Error', 'Failed to load groups')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = useCallback(() => {
    console.log('🔄 Pull-to-refresh triggered')
    loadUserGroups(true)
  }, [loadUserGroups])

  // Load user's groups when component mounts and every time user changes
  useEffect(() => {
    console.log('📱 FriendsScreen: Component mounted or user changed, loading groups...')
    loadUserGroups()
  }, [user?.id, loadUserGroups])

  // Reload groups when refreshTrigger changes (after creating a group)
  useEffect(() => {
    if (refreshTrigger) {
      console.log('🔄 Friends refresh triggered, reloading groups...')
      loadUserGroups()
    }
  }, [refreshTrigger, loadUserGroups])

  // Set up real-time subscription for group changes
  useEffect(() => {
    if (!user?.id) return

    console.log('🔄 Setting up real-time group subscriptions...')

    // Subscribe to changes in groups table
    const groupsSubscription = supabase
      .channel('groups_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'groups'
        }, 
        (payload) => {
          console.log('📡 Group change detected:', payload)
          loadUserGroups() // Reload groups when any group changes
        }
      )
      .subscribe()

    // Subscribe to changes in group_members table (for invitation acceptances, etc.)
    const membersSubscription = supabase
      .channel('group_members_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'group_members'
        }, 
        (payload) => {
          console.log('📡 Group membership change detected:', payload)
          // Only reload if this change involves the current user
          const newRecord = payload.new as any
          const oldRecord = payload.old as any
          if (newRecord?.user_id === user.id || oldRecord?.user_id === user.id) {
            loadUserGroups()
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🧹 Cleaning up group subscriptions')
      groupsSubscription.unsubscribe()
      membersSubscription.unsubscribe()
    }
  }, [user?.id, loadUserGroups])

  /**
   * Load pending group invitations
   */
  const loadPendingInvitations = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error } = await DatabaseService.getPendingGroupInvitations(user.id)
      
      if (error) {
        console.error('❌ Error loading pending invitations:', error)
        return
      }

      if (data) {
        // Filter out any malformed invitations
        const validInvitations = data.filter(invitation => 
          invitation && 
          invitation.id && 
          invitation.group &&
          invitation.invited_by_user
        )
        setPendingInvitations(validInvitations)
        console.log(`✅ Loaded ${validInvitations.length} valid pending invitations (${data.length} total)`)
      }
    } catch (error) {
      console.error('❌ Exception loading pending invitations:', error)
    }
  }, [user?.id])

  // Load pending invitations when component mounts
  useEffect(() => {
    loadPendingInvitations()
  }, [loadPendingInvitations])

  /**
   * Handle invitation response
   */
  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    try {
      const { error } = await DatabaseService.respondToGroupInvitation(invitationId, response)
      
      if (error) {
        Alert.alert('Error', 'Failed to respond to invitation. Please try again.')
        return
      }

      // Remove the invitation from the list
      setPendingInvitations(prev => {
        const newInvitations = prev.filter(inv => inv.id !== invitationId)
        
        // Close modal if no more invitations remain
        if (newInvitations.length === 0) {
          setShowInvitesModal(false)
        }
        
        return newInvitations
      })
      
      Alert.alert(
        'Success',
        `Group invitation ${response === 'accepted' ? 'accepted' : 'declined'} successfully!`
      )

      // Reload groups if invitation was accepted
      if (response === 'accepted') {
        loadUserGroups()
      }
    } catch (error) {
      console.error('Error responding to invitation:', error)
      Alert.alert('Error', 'Failed to respond to invitation. Please try again.')
    }
  }

  /**
   * Format date for invitations
   */
  const formatInvitationDate = (dateString?: string): string => {
    try {
      if (!dateString) return 'Unknown date'
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return 'Unknown date'
    }
  }

  /**
   * Handle group card press - navigate to group details screen
   */
  const handleGroupPress = (group: GroupWithMembers) => {
    console.log('📋 Navigating to group:', group.name)
    onNavigateToGroup(group.id)
  }



  /**
   * Render group card item
   */
  const renderGroupCard = ({ item }: { item: GroupWithMembers }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => handleGroupPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.groupCardHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.memberCount}>
          {item.member_count} member{item.member_count !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {item.description && (
        <Text style={styles.groupDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000000']}
            tintColor='#000000'
          />
        }
      >
        {/* Groups Section */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Loading your groups...</Text>
          </View>
        ) : userGroups.length > 0 ? (
          <View style={styles.groupsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity 
                style={styles.invitesButton}
                onPress={() => setShowInvitesModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.invitesButtonText}>
                  Invites {pendingInvitations.length > 0 && `(${pendingInvitations.length})`}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={userGroups}
              renderItem={renderGroupCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
            
            {/* Create Group Button */}
            <TouchableOpacity 
              style={styles.createGroupButton}
              onPress={onNavigateToCreateGroup}
              activeOpacity={0.8}
            >
              <Text style={styles.createGroupButtonText}>Create Another Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Groups</Text>
              <TouchableOpacity 
                style={styles.invitesButton}
                onPress={() => setShowInvitesModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.invitesButtonText}>
                  Invites {pendingInvitations.length > 0 && `(${pendingInvitations.length})`}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.emptyStateTitle}>No Groups Yet</Text>
            <Text style={styles.emptyStateDescription}>
              Create your first group to start sharing audio discoveries with friends!
            </Text>
            
            {/* Create Group Button */}
            <TouchableOpacity 
              style={styles.createGroupButton}
              onPress={onNavigateToCreateGroup}
              activeOpacity={0.8}
            >
              <Text style={styles.createGroupButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Invites Modal */}
      <Modal
        visible={showInvitesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInvitesModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowInvitesModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Group Invites</Text>
            <View style={styles.modalHeaderRight} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {pendingInvitations.length > 0 ? (
              <>
                <View style={styles.invitationAlert}>
                  <Text style={styles.invitationAlertText}>
                    🎉 You have {pendingInvitations.length} group invitation{pendingInvitations.length !== 1 ? 's' : ''}!
                  </Text>
                </View>
                
                {pendingInvitations.filter(invitation => invitation && invitation.id).map((invitation) => (
                  <View key={invitation.id} style={styles.invitationItem}>
                    <View style={styles.invitationInfo}>
                      <Text style={styles.invitationGroupName}>{invitation.group?.name || 'Unknown Group'}</Text>
                      <Text style={styles.invitationFromText}>
                        Invited by {invitation.invited_by_user?.first_name || 'Unknown'} {invitation.invited_by_user?.last_name || 'User'}
                      </Text>
                      <Text style={styles.invitationDateText}>
                        {formatInvitationDate(invitation.joined_at || new Date().toISOString())}
                      </Text>
                    </View>
                    
                    <View style={styles.invitationActions}>
                      <TouchableOpacity
                        style={styles.declineButton}
                        onPress={() => handleInvitationResponse(invitation.id, 'declined')}
                      >
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleInvitationResponse(invitation.id, 'accepted')}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyInvitesState}>
                <Text style={styles.emptyInvitesTitle}>No Invites</Text>
                <Text style={styles.emptyInvitesDescription}>
                  You don't have any pending group invitations.
                </Text>
              </View>
            )}
          </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  createGroupButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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
  groupsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  memberCount: {
    fontSize: 14,
    color: '#404040',
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 14,
    color: '#808080',
    lineHeight: 20,
    marginBottom: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Invites section styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 20,
  },
  invitesButton: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  invitesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Modal styles
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
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  modalHeaderRight: {
    width: 60, // Balance the close button
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Invitation styles
  invitationAlert: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#000000',
  },
  invitationAlertText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    textAlign: 'center',
  },
  invitationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  invitationInfo: {
    marginBottom: 16,
  },
  invitationGroupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  invitationFromText: {
    fontSize: 14,
    color: '#404040',
    marginBottom: 2,
  },
  invitationDateText: {
    fontSize: 12,
    color: '#808080',
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#404040',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  emptyInvitesState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyInvitesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyInvitesDescription: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default FriendsScreen 