import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import UnauthenticatedFlow from './src/components/UnauthenticatedFlow';
import MainApp from './src/components/MainApp';

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {user ? <MainApp /> : <UnauthenticatedFlow />}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF1E8',
  },
});

export default App; 