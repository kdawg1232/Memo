import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import MapScreen from '../screens/MapScreen'
import FriendsScreen from '../screens/FriendsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { MapIcon, ProfileIcon, FriendsIcon } from './Icons'

type ScreenType = 'map' | 'friends' | 'profile'

const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('map')

  // Navigation handlers
  const handleNavigateToMap = () => setCurrentScreen('map')
  const handleNavigateToFriends = () => setCurrentScreen('friends')
  const handleNavigateToProfile = () => setCurrentScreen('profile')

  // Render the current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'map':
        return <MapScreen />
      case 'friends':
        return <FriendsScreen onNavigateBack={handleNavigateToMap} />
      case 'profile':
        return <ProfileScreen onNavigateBack={handleNavigateToMap} />
      default:
        return <MapScreen />
    }
  }

  // Create navigation icons using PNG images
  const getNavigationIcon = (screen: ScreenType, isActive: boolean) => {
    const iconSize = 24
    const iconStyle = {
      opacity: isActive ? 1 : 0.6, // Use opacity instead of color for PNG images
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
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {renderCurrentScreen()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
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
            currentScreen === 'profile' && styles.navButtonActive
          ]}
          onPress={handleNavigateToProfile}
        >
          <View style={styles.navIcon}>
            {getNavigationIcon('profile', currentScreen === 'profile')}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20, // Account for safe area
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
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
    backgroundColor: '#2A9D8F',
  },
  navIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default MainApp 