import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface FriendsScreenProps {
  onNavigateBack: () => void
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onNavigateBack }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Map</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.titleText}>👥 Friends</Text>
        <Text style={styles.descriptionText}>
          Connect with friends to see their audio pins and share your discoveries!
        </Text>
        <Text style={styles.comingSoonText}>Coming Soon...</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF1E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#FBF1E8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#2A9D8F',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#264653',
  },
  placeholder: {
    width: 50, // Same width as back button for centering
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#264653',
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  comingSoonText: {
    fontSize: 18,
    color: '#E76F51',
    fontStyle: 'italic',
  },
})

export default FriendsScreen 