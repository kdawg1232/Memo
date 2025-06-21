import React, { useState, useRef, useEffect } from 'react'
import { Animated, Dimensions } from 'react-native'
import LandingScreen from '../screens/LandingScreen'
import AuthForm from './AuthForm'

type ScreenType = 'landing' | 'login' | 'signup'

const { width } = Dimensions.get('window')

const UnauthenticatedFlow: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('landing')
  const slideAnim = useRef(new Animated.Value(0)).current

  // Animation function for smooth transitions
  const animateToScreen = (direction: 'forward' | 'back') => {
    const toValue = direction === 'forward' ? -width : 0
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const handleGetStarted = () => {
    animateToScreen('forward')
    setTimeout(() => {
      setCurrentScreen('signup')
      slideAnim.setValue(0) // Reset position for new screen
    }, 150) // Half of animation duration for smooth transition
  }

  const handleSignIn = () => {
    animateToScreen('forward')
    setTimeout(() => {
      setCurrentScreen('login')
      slideAnim.setValue(0) // Reset position for new screen
    }, 150)
  }

  const handleBack = () => {
    animateToScreen('back')
    setTimeout(() => {
      setCurrentScreen('landing')
      slideAnim.setValue(0) // Reset position for new screen
    }, 150)
  }

  // Render different screens based on current state with animations
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingScreen 
            onGetStarted={handleGetStarted}
            onSignIn={handleSignIn}
          />
        )
      case 'login':
        return (
          <AuthForm 
            initialMode="login"
            onBack={handleBack}
          />
        )
      case 'signup':
        return (
          <AuthForm 
            initialMode="signup"
            onBack={handleBack}
          />
        )
      default:
        return (
          <LandingScreen 
            onGetStarted={handleGetStarted}
            onSignIn={handleSignIn}
          />
        )
    }
  }

  return (
    <Animated.View 
      style={{
        flex: 1,
        transform: [{ translateX: slideAnim }]
      }}
    >
      {renderCurrentScreen()}
    </Animated.View>
  )
}

export default UnauthenticatedFlow 