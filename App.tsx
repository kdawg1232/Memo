import React, { useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Animated, Text } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import UnauthenticatedFlow from './src/components/UnauthenticatedFlow';
import MainApp from './src/components/MainApp';

const App: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevUserRef = useRef(user);

  // Determine if user is fully authenticated (email confirmed + profile exists)
  const isAuthenticated = user && user.email_confirmed_at && userProfile;

  // Animate when authentication state changes
  useEffect(() => {
    const currentAuthState = isAuthenticated;
    const prevAuthState = prevUserRef.current && userProfile;
    
    if (currentAuthState !== prevAuthState) {
      console.log('🔄 App: Authentication state changed, animating transition')
      
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Update previous user ref
        prevUserRef.current = user;
        
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [isAuthenticated, user, userProfile]);

  // Show loading screen while initializing auth
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Show email confirmation message if user signed up but hasn't confirmed email
  if (user && !user.email_confirmed_at) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationTitle}>Check Your Email</Text>
          <Text style={styles.confirmationText}>
            We've sent a confirmation link to {user.email}. 
            Please click the link in your email to activate your account.
          </Text>
          <Text style={styles.confirmationSubtext}>
            Once confirmed, you'll be automatically signed in.
          </Text>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Show loading if user is confirmed but profile not yet loaded
  if (user && user.email_confirmed_at && !userProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Setting up your account...</Text>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Main app logic: show authenticated app or unauthenticated flow
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {isAuthenticated ? <MainApp /> : <UnauthenticatedFlow />}
      </Animated.View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#404040',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  confirmationSubtext: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default App; 