import React, { useState } from 'react'
import LandingScreen from '../screens/LandingScreen'
import AuthForm from './AuthForm'

type ScreenType = 'landing' | 'login' | 'signup'

const UnauthenticatedFlow: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('landing')

  const handleGetStarted = () => {
    setCurrentScreen('signup')
  }

  const handleSignIn = () => {
    setCurrentScreen('login')
  }

  const handleBack = () => {
    setCurrentScreen('landing')
  }

  // Render different screens based on current state
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

export default UnauthenticatedFlow 