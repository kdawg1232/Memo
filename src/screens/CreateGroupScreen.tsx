import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { 
  DatabaseService, 
  CreateGroupData, 
  UserSearchResult,
  GroupInvitationData 
} from '../services/database'

interface CreateGroupScreenProps {
  onNavigateBack: () => void
}

interface InvitedUser extends UserSearchResult {
  isInvited: boolean
}

const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ onNavigateBack }) => {
  const { user } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<InvitedUser[]>([])
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  
  const searchTimeoutRef = useRef<number | null>(null)
  const tempGroupIdRef = useRef<string | null>(null)

  // Search for users to invite with debouncing
  const searchUsers = async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data, error } = await DatabaseService.searchUsersByUsername(term.trim(), 10)
      
      if (error) {
        console.error('Error searching users:', error)
        setSearchResults([])
        return
      }

      if (data) {
        // Filter out current user and already invited users
                 const filteredResults = data
           .filter(searchUser => user?.id && searchUser.id !== user.id)
          .map(searchUser => ({
            ...searchUser,
            isInvited: invitedUsers.some(invited => invited.id === searchUser.id)
          }))
        
        setSearchResults(filteredResults)
      }
    } catch (error) {
      console.error('Exception searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input change with debouncing
  const handleSearchChange = (text: string) => {
    setSearchTerm(text)
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(text)
    }, 300) // 300ms debounce
  }

  // Add user to invited list
  const handleInviteUser = (user: UserSearchResult) => {
    const newInvitedUser: InvitedUser = { ...user, isInvited: true }
    setInvitedUsers(prev => [...prev, newInvitedUser])
    
    // Update search results to mark user as invited
    setSearchResults(prev => 
      prev.map(searchUser => 
        searchUser.id === user.id 
          ? { ...searchUser, isInvited: true }
          : searchUser
      )
    )
  }

  // Remove user from invited list
  const handleRemoveUser = (userId: string) => {
    setInvitedUsers(prev => prev.filter(user => user.id !== userId))
    
    // Update search results to mark user as not invited
    setSearchResults(prev => 
      prev.map(searchUser => 
        searchUser.id === userId 
          ? { ...searchUser, isInvited: false }
          : searchUser
      )
    )
  }

  // Create group and send invitations
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name')
      return
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to create a group')
      return
    }

    setIsCreatingGroup(true)
    
    try {
      // Create the group
      const groupData: CreateGroupData = {
        name: groupName.trim(),
        description: groupDescription.trim() || undefined
      }

      const { data: newGroup, error: groupError } = await DatabaseService.createGroup(groupData)
      
      if (groupError || !newGroup) {
        Alert.alert('Error', 'Failed to create group. Please try again.')
        return
      }

      tempGroupIdRef.current = newGroup.id
      console.log('✅ Group created successfully:', newGroup.name)

      // Send invitations to all invited users
      if (invitedUsers.length > 0) {
        console.log(`📨 Sending ${invitedUsers.length} invitations...`)
        
        const invitationPromises = invitedUsers.map(invitedUser => {
          const invitationData: GroupInvitationData = {
            group_id: newGroup.id,
            user_id: invitedUser.id,
            role: 'member'
          }
          return DatabaseService.addGroupMember(invitationData)
        })

        const invitationResults = await Promise.allSettled(invitationPromises)
        
        // Count successful invitations
        const successfulInvitations = invitationResults.filter(
          result => result.status === 'fulfilled' && result.value.data
        ).length

        const failedInvitations = invitationResults.length - successfulInvitations

        if (failedInvitations > 0) {
          console.warn(`⚠️  ${failedInvitations} invitations failed to send`)
        }

        Alert.alert(
          'Group Created!',
          `Group "${newGroup.name}" created successfully!\n${successfulInvitations} invitation${successfulInvitations !== 1 ? 's' : ''} sent.`,
          [{ text: 'OK', onPress: () => onNavigateBack() }]
        )
      } else {
        Alert.alert(
          'Group Created!',
          `Group "${newGroup.name}" created successfully!`,
          [{ text: 'OK', onPress: () => onNavigateBack() }]
        )
      }
    } catch (error) {
      console.error('Exception creating group:', error)
      Alert.alert('Error', 'Failed to create group. Please try again.')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  // Format user display name
  const formatUserDisplayName = (user: UserSearchResult) => {
    return `${user.first_name} ${user.last_name} (@${user.username})`
  }

  // Render search result item
  const renderSearchResult = ({ item }: { item: InvitedUser }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        item.isInvited && styles.userItemInvited
      ]}
      onPress={() => item.isInvited ? handleRemoveUser(item.id) : handleInviteUser(item)}
      disabled={item.isInvited}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{formatUserDisplayName(item)}</Text>
      </View>
      <View style={[
        styles.inviteButton,
        item.isInvited && styles.inviteButtonInvited
      ]}>
        <Text style={[
          styles.inviteButtonText,
          item.isInvited && styles.inviteButtonTextInvited
        ]}>
          {item.isInvited ? 'Invited' : 'Invite'}
        </Text>
      </View>
    </TouchableOpacity>
  )

  // Render invited user item
  const renderInvitedUser = ({ item }: { item: InvitedUser }) => (
    <View style={styles.invitedUserItem}>
      <Text style={styles.invitedUserName}>{formatUserDisplayName(item)}</Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveUser(item.id)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Details</Text>
          
          <Text style={styles.inputLabel}>Group Name *</Text>
          <TextInput
            style={styles.textInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
            placeholderTextColor="#808080"
            maxLength={100}
          />
          
          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={groupDescription}
            onChangeText={setGroupDescription}
            placeholder="Describe your group..."
            placeholderTextColor="#808080"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Invite Friends Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite Friends</Text>
          
          <Text style={styles.inputLabel}>Search by Username</Text>
          <TextInput
            style={styles.textInput}
            value={searchTerm}
            onChangeText={handleSearchChange}
            placeholder="Search usernames..."
            placeholderTextColor="#808080"
            autoCapitalize="none"
          />

          {/* Search Results */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#808080" />
              <Text style={styles.loadingText}>Searching users...</Text>
            </View>
          )}

          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>Search Results</Text>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchResult}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Invited Users */}
          {invitedUsers.length > 0 && (
            <View style={styles.invitedUsersContainer}>
              <Text style={styles.invitedUsersTitle}>
                Invited Users ({invitedUsers.length})
              </Text>
              <FlatList
                data={invitedUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderInvitedUser}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Group Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!groupName.trim() || isCreatingGroup) && styles.createButtonDisabled
          ]}
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || isCreatingGroup}
        >
          {isCreatingGroup ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2C',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#808080',
    fontSize: 14,
  },
  searchResultsContainer: {
    marginTop: 16,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
  },
  userItemInvited: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inviteButtonInvited: {
    backgroundColor: '#808080',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  inviteButtonTextInvited: {
    color: '#FFFFFF',
  },
  invitedUsersContainer: {
    marginTop: 20,
  },
  invitedUsersTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  invitedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
  },
  invitedUserName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
  },
  removeButton: {
    backgroundColor: '#000000',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  createButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#808080',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
})

export default CreateGroupScreen 