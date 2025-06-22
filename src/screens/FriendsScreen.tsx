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
  RefreshControl
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { DatabaseService, GroupWithMembers } from '../services/database'
import { supabase } from '../services/supabase'

interface FriendsScreenProps {
  onNavigateBack: () => void
  onNavigateToCreateGroup: () => void
  refreshTrigger?: number
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onNavigateBack, onNavigateToCreateGroup, refreshTrigger }) => {
  const { user } = useAuth()
  const [userGroups, setUserGroups] = useState<GroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
   * Handle group card press - show group details
   */
  const handleGroupPress = (group: GroupWithMembers) => {
    const membersList = group.members
      .filter(member => member.status === 'accepted')
      .map(member => `• ${member.user.first_name} ${member.user.last_name} (${member.user.username})`)
      .join('\n')

    const groupInfo = `📊 Group Details:
• ${group.member_count} member${group.member_count !== 1 ? 's' : ''}
• Created ${formatDate(group.created_at)}
• Created by ${group.created_by_user.first_name} ${group.created_by_user.last_name}

👥 Members:
${membersList || 'No members yet'}

📝 Description:
${group.description || 'No description provided'}`

    Alert.alert(
      `📋 ${group.name}`,
      groupInfo,
      [
        { text: 'Refresh Groups', onPress: () => loadUserGroups() },
        { text: 'Close', style: 'cancel' }
      ]
    )
  }

  /**
   * Format creation date
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
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
      
      <Text style={styles.groupDate}>Created {formatDate(item.created_at)}</Text>
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
            <Text style={styles.sectionTitle}>Your Groups</Text>
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
    marginBottom: 16,
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
  groupDate: {
    fontSize: 12,
    color: '#808080',
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
})

export default FriendsScreen 