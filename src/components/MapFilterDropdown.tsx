import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native'
import { DatabaseService, GroupWithMembers } from '../services/database'
import { useAuth } from '../hooks/useAuth'

export type FilterOption = {
  id: string
  name: string
  type: 'personal' | 'group'
  groupData?: GroupWithMembers
}

interface MapFilterDropdownProps {
  selectedFilter: FilterOption | null
  onFilterChange: (filter: FilterOption | null) => void
  refreshTrigger?: number // Trigger refresh when groups change
}

const MapFilterDropdown: React.FC<MapFilterDropdownProps> = ({
  selectedFilter,
  onFilterChange,
  refreshTrigger = 0
}) => {
  const { user } = useAuth()
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const [availableFilters, setAvailableFilters] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(false)

  // Load available filters when component mounts or refreshTrigger changes
  useEffect(() => {
    if (user?.id) {
      loadAvailableFilters()
    }
  }, [user?.id, refreshTrigger])

  const loadAvailableFilters = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      console.log('🔄 Loading available filters for map...')

      // Get user's groups
      const { data: groups, error } = await DatabaseService.getUserGroups(user.id)
      
      if (error) {
        console.error('❌ Error loading user groups for filter:', error)
        return
      }

      // Create filter options
      const filters: FilterOption[] = [
        // Personal pins option (always first)
        {
          id: 'personal',
          name: 'My Personal Pins',
          type: 'personal'
        },
        // Add all groups
        ...(groups || []).map(group => ({
          id: group.id,
          name: group.name,
          type: 'group' as const,
          groupData: group
        }))
      ]

      setAvailableFilters(filters)
      console.log(`✅ Loaded ${filters.length} filter options`)

      // If no filter is selected, default to personal pins
      if (!selectedFilter && filters.length > 0) {
        onFilterChange(filters[0]) // Select personal pins by default
      }

    } catch (error) {
      console.error('❌ Exception loading available filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterSelect = (filter: FilterOption) => {
    console.log('🎯 Filter selected:', filter.name)
    onFilterChange(filter)
    setIsDropdownVisible(false)
  }

  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible)
  }

  const handleCloseDropdown = () => {
    setIsDropdownVisible(false)
  }

  // Get display text for current filter
  const getDisplayText = () => {
    if (!selectedFilter) return 'Select Filter'
    return selectedFilter.name
  }

  // Get member count for group filters
  const getMemberCount = (filter: FilterOption) => {
    if (filter.type === 'personal') return null
    return filter.groupData?.member_count || 0
  }

  return (
    <View style={styles.container}>
      {/* Dropdown button */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownButtonText} numberOfLines={1}>
          {getDisplayText()}
        </Text>
        <Text style={styles.dropdownArrow}>
          {isDropdownVisible ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Dropdown modal */}
      <Modal
        visible={isDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseDropdown}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseDropdown}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.modalTitle}>Filter Map Pins</Text>
            
            <ScrollView 
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading filters...</Text>
                </View>
              ) : availableFilters.length > 0 ? (
                availableFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterOption,
                      selectedFilter?.id === filter.id && styles.selectedFilterOption
                    ]}
                    onPress={() => handleFilterSelect(filter)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.filterOptionContent}>
                      <Text style={[
                        styles.filterOptionText,
                        selectedFilter?.id === filter.id && styles.selectedFilterOptionText
                      ]}>
                        {filter.name}
                      </Text>
                      
                      {filter.type === 'personal' ? (
                        <Text style={styles.filterOptionSubtext}>
                          Your voice memos
                        </Text>
                      ) : (
                        <Text style={styles.filterOptionSubtext}>
                          {getMemberCount(filter)} member{getMemberCount(filter) !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    
                    {selectedFilter?.id === filter.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No groups available</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create or join a group to see more filter options
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 60, // Increased from 10 to account for status bar
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 200,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#666666',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: 130, // Position below the dropdown button (accounting for status bar)
  },
  dropdownModal: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    maxHeight: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionsList: {
    maxHeight: 300,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  selectedFilterOption: {
    backgroundColor: '#F5F5F5',
  },
  filterOptionContent: {
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  selectedFilterOptionText: {
    fontWeight: '600',
  },
  filterOptionSubtext: {
    fontSize: 14,
    color: '#666666',
  },
  checkmark: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default MapFilterDropdown 