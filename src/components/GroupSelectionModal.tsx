import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { DatabaseService, GroupWithMembers } from '../services/database'

interface GroupSelectionModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (selectedGroupIds: string[]) => void
  recordingUri: string
  durationSeconds: number
}

const GroupSelectionModal: React.FC<GroupSelectionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  recordingUri,
  durationSeconds,
}) => {
  const { user } = useAuth()
  const [userGroups, setUserGroups] = useState<GroupWithMembers[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Debug: Log visibility changes
  useEffect(() => {
    console.log('🔄 GroupSelectionModal visibility changed:', visible)
    console.log('📝 GroupSelectionModal props:', { visible, recordingUri, durationSeconds })
  }, [visible, recordingUri, durationSeconds])

  /**
   * Load user's groups when modal opens
   */
  const loadUserGroups = async () => {
    if (!user?.id) {
      console.log('❌ GroupSelectionModal: No user ID available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('🔍 GroupSelectionModal: Loading user groups for pin sharing...')
      console.log('🔍 GroupSelectionModal: User ID:', user.id)
      
      const { data, error } = await DatabaseService.getUserGroupsForPinSharing(user.id)
      
      console.log('📊 GroupSelectionModal: Raw response from getUserGroupsForPinSharing:')
      console.log('   data:', data)
      console.log('   error:', error)
      
      if (error) {
        console.error('❌ GroupSelectionModal: Error loading user groups:', error)
        console.error('❌ GroupSelectionModal: Error details:', JSON.stringify(error, null, 2))
        Alert.alert('Error', 'Failed to load your groups. Please try again.')
        return
      }

      if (data) {
        setUserGroups(data)
        console.log(`✅ GroupSelectionModal: Loaded ${data.length} groups for pin sharing`)
        console.log('📋 GroupSelectionModal: Groups:', data.map(g => ({ id: g.id, name: g.name, memberCount: g.member_count })))
      } else {
        console.log('⚠️ GroupSelectionModal: No groups data returned (data is null)')
        setUserGroups([])
      }
    } catch (error) {
      console.error('❌ GroupSelectionModal: Exception loading user groups:', error)
      console.error('❌ GroupSelectionModal: Exception details:', JSON.stringify(error, null, 2))
      Alert.alert('Error', 'Failed to load your groups. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Load groups when modal becomes visible
  useEffect(() => {
    if (visible) {
      console.log('🔄 GroupSelectionModal became visible, loading groups...')
      loadUserGroups()
      setSelectedGroupIds([]) // Reset selection when modal opens
    }
  }, [visible, user?.id])

  // Debug state changes
  useEffect(() => {
    console.log('🎯 STATE UPDATE: loading=', loading, 'userGroups.length=', userGroups.length, 'visible=', visible)
    if (userGroups.length > 0) {
      console.log('🎯 STATE UPDATE: Groups:', userGroups.map(g => ({id: g.id, name: g.name})))
    }
  }, [loading, userGroups, visible])

  /**
   * Toggle group selection
   */
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => {
      if (prev.includes(groupId)) {
        // Remove from selection
        console.log(`🔄 Removing group ${groupId} from selection`)
        return prev.filter(id => id !== groupId)
      } else {
        // Add to selection
        console.log(`✅ Adding group ${groupId} to selection`)
        return [...prev, groupId]
      }
    })
  }

  /**
   * Handle confirm button press
   */
  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      console.log(`📌 Add to Groups pressed!`)
      console.log(`📌 Selected ${selectedGroupIds.length} groups:`, selectedGroupIds)
      console.log(`📌 Available groups:`, userGroups.map(g => ({ id: g.id, name: g.name })))
      
      // Pass the selected group IDs to the parent
      onConfirm(selectedGroupIds)
      
      // Reset modal state
      setSelectedGroupIds([])
      onClose()
    } catch (error) {
      console.error('❌ Error confirming group selection:', error)
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Handle cancel button press
   */
  const handleCancel = () => {
    setSelectedGroupIds([])
    onClose()
  }

  /**
   * Format duration for display
   */
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]} 
              onPress={handleConfirm}
              disabled={submitting}
            >
              <Text style={styles.confirmButtonText}>
                {submitting ? 'Adding...' : 'Add to Groups'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Groups List */}
          <View style={styles.groupsSection}>
            <Text style={styles.sectionTitle}>
              Select groups to share with ({selectedGroupIds.length} selected):
            </Text>
            

            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={styles.loadingText}>Loading your groups...</Text>
              </View>
            ) : userGroups.length > 0 ? (
              <ScrollView style={styles.groupsList} showsVerticalScrollIndicator={false}>
                {userGroups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupItem,
                      selectedGroupIds.includes(group.id) && styles.groupItemSelected
                    ]}
                    onPress={() => toggleGroupSelection(group.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupMembers}>
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      selectedGroupIds.includes(group.id) && styles.checkboxSelected
                    ]}>
                      {selectedGroupIds.includes(group.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Groups Found</Text>
                <Text style={styles.emptyStateDescription}>
                  Create a group first to share audio pins, or check if you have groups in the Friends screen.
                </Text>
              </View>
            )}
          </View>

          {/* Skip Option */}
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => onConfirm([])} // Pass empty array to create personal pin only
          >
            <Text style={styles.skipButtonText}>Skip - Save as Personal Pin Only</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    marginBottom: 20,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#404040',
  },

  confirmButton: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#808080',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  groupsSection: {
    flex: 1,
    minHeight: 300,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#808080',
  },
  groupsList: {
    flex: 1,
    maxHeight: 300,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#F5F5F5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupItemSelected: {
    borderColor: '#000000',
    backgroundColor: '#F8F8F8',
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 14,
    color: '#404040',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },
  skipButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#404040',
  },
})

export default GroupSelectionModal 