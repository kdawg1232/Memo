import React, { useState, useRef, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions } from 'react-native'
import MapScreen from '../screens/MapScreen'
import FriendsScreen from '../screens/FriendsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'
import CreateGroupScreen from '../screens/CreateGroupScreen'
import GroupScreen from '../screens/GroupScreen'
import { MapIcon, ProfileIcon, FriendsIcon } from './Icons'

type ScreenType = 'map' | 'friends' | 'profile' | 'settings' | 'createGroup' | 'group'

const { width } = Dimensions.get('window')

const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('map')
  const [shouldCenterOnUser, setShouldCenterOnUser] = useState<boolean>(false)
  const [mapRefreshTrigger, setMapRefreshTrigger] = useState<number>(0)
  const [friendsRefreshTrigger, setFriendsRefreshTrigger] = useState<number>(0)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  
  // Animation values for screen transitions
  const slideAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current

  // Animation function for smooth transitions
  const animateToScreen = (newScreen: ScreenType) => {
    if (newScreen === currentScreen) return

    // Determine slide direction based on screen order
    const screenOrder: ScreenType[] = ['profile', 'map', 'friends']
    const currentIndex = screenOrder.indexOf(currentScreen)
    const newIndex = screenOrder.indexOf(newScreen)
    const direction = newIndex > currentIndex ? 'left' : 'right'
    
    // Start transition animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === 'left' ? -width * 0.1 : width * 0.1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Change screen at halfway point
      setCurrentScreen(newScreen)
      
      // Complete the transition
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    })
  }

  // Navigation handlers with animations
  const handleNavigateToMap = () => {
    console.log('🗺️ Map button pressed, current screen:', currentScreen)
    if (currentScreen === 'map') {
      // If already on map screen, center on user location
      console.log('🎯 Already on map, triggering center on user location')
      setShouldCenterOnUser(true)
    } else {
      // If coming from ProfileScreen, trigger a refresh to reload pins
      if (currentScreen === 'profile') {
        console.log('🔄 Returning from profile, triggering map refresh')
        setMapRefreshTrigger(Date.now())
      }
      // Otherwise animate to map screen
      console.log('📱 Animating to map screen')
      animateToScreen('map')
    }
  }

  const handleNavigateToFriends = () => {
    console.log('👥 Animating to friends screen')
    // Always trigger a refresh when navigating to friends screen to ensure fresh data
    console.log('🔄 Navigating to friends, triggering refresh to load latest groups')
    setFriendsRefreshTrigger(Date.now())
    animateToScreen('friends')
  }

  const handleNavigateToProfile = () => {
    console.log('👤 Animating to profile screen')
    animateToScreen('profile')
  }

  const handleNavigateToSettings = () => {
    console.log('⚙️ Animating to settings screen')
    animateToScreen('settings')
  }

  const handleNavigateToCreateGroup = () => {
    console.log('🆕 Animating to create group screen')
    animateToScreen('createGroup')
  }

  const handleNavigateToGroup = (groupId: string) => {
    console.log('📋 Animating to group screen for group:', groupId)
    setSelectedGroupId(groupId)
    animateToScreen('group')
  }

  // Render the current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'map':
        return (
          <MapScreen 
            shouldCenterOnUser={shouldCenterOnUser}
            onCenterCompleted={() => setShouldCenterOnUser(false)}
            refreshTrigger={mapRefreshTrigger}
          />
        )
      case 'friends':
        return <FriendsScreen onNavigateBack={handleNavigateToMap} onNavigateToCreateGroup={handleNavigateToCreateGroup} onNavigateToGroup={handleNavigateToGroup} refreshTrigger={friendsRefreshTrigger} />
      case 'profile':
        return <ProfileScreen onNavigateBack={handleNavigateToMap} onNavigateToSettings={handleNavigateToSettings} />
      case 'settings':
        return <SettingsScreen onNavigateBack={handleNavigateToProfile} />
      case 'createGroup':
        return <CreateGroupScreen onNavigateBack={handleNavigateToFriends} />
      case 'group':
        return <GroupScreen groupId={selectedGroupId} onNavigateBack={handleNavigateToFriends} />
      default:
        return (
          <MapScreen 
            shouldCenterOnUser={shouldCenterOnUser}
            onCenterCompleted={() => setShouldCenterOnUser(false)}
            refreshTrigger={mapRefreshTrigger}
          />
        )
    }
  }

  // Create navigation icons using PNG images
  const getNavigationIcon = (screen: ScreenType, isActive: boolean) => {
    const iconSize = 24
    const iconStyle = {
      opacity: isActive ? 1 : 0.4, // Changed from 0.6 to 0.4 for better contrast with neutral theme
    }
    
    switch (screen) {
      case 'friends':
        return <FriendsIcon size={iconSize} style={iconStyle} />
      case 'map':
        return <MapIcon size={iconSize} style={iconStyle} />
      case 'profile':
        return <ProfileIcon size={iconSize} style={iconStyle} />
      default:
        return <MapIcon size={iconSize} style={iconStyle} />
    }
  }

  return (
    <View style={styles.container}>
      {/* Main Content with Animation */}
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        {renderCurrentScreen()}
      </Animated.View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentScreen === 'profile' && styles.navButtonActive
          ]}
          onPress={handleNavigateToProfile}
        >
          <View style={styles.navIcon}>
            {getNavigationIcon('profile', currentScreen === 'profile')}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentScreen === 'map' && styles.navButtonActive
          ]}
          onPress={handleNavigateToMap}
        >
          <View style={styles.navIcon}>
            {getNavigationIcon('map', currentScreen === 'map')}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentScreen === 'friends' && styles.navButtonActive
          ]}
          onPress={handleNavigateToFriends}
        >
          <View style={styles.navIcon}>
            {getNavigationIcon('friends', currentScreen === 'friends')}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  navButtonActive: {
    backgroundColor: '#F5F5F5',
  },
  navIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default MainApp 