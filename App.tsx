import React, { useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Animated } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import UnauthenticatedFlow from './src/components/UnauthenticatedFlow';
import MainApp from './src/components/MainApp';

const App: React.FC = () => {
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevUserRef = useRef(user);

  // Animate when user state changes
  useEffect(() => {
    if (prevUserRef.current !== user) {
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
  }, [user]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {user ? <MainApp /> : <UnauthenticatedFlow />}
      </Animated.View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF1E8',
  },
  contentContainer: {
    flex: 1,
  },
});

export default App; 