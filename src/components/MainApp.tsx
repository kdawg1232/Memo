import React, { useState, useRef, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions } from 'react-native'
import MapScreen from '../screens/MapScreen'
import FriendsScreen from '../screens/FriendsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { MapIcon, ProfileIcon, FriendsIcon } from './Icons'

type ScreenType = 'map' | 'friends' | 'profile'

const { width } = Dimensions.get('window')

const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('map')
  const [shouldCenterOnUser, setShouldCenterOnUser] = useState<boolean>(false)
  
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
      // Otherwise animate to map screen
      console.log('📱 Animating to map screen')
      animateToScreen('map')
    }
  }

  const handleNavigateToFriends = () => {
    console.log('👥 Animating to friends screen')
    animateToScreen('friends')
  }

  const handleNavigateToProfile = () => {
    console.log('👤 Animating to profile screen')
    animateToScreen('profile')
  }

  // Render the current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'map':
        return (
          <MapScreen 
            shouldCenterOnUser={shouldCenterOnUser}
            onCenterCompleted={() => setShouldCenterOnUser(false)}
          />
        )
      case 'friends':
        return <FriendsScreen onNavigateBack={handleNavigateToMap} />
      case 'profile':
        return <ProfileScreen onNavigateBack={handleNavigateToMap} />
      default:
        return (
          <MapScreen 
            shouldCenterOnUser={shouldCenterOnUser}
            onCenterCompleted={() => setShouldCenterOnUser(false)}
          />
        )
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