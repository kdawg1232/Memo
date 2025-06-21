import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native'

interface LandingScreenProps {
  onGetStarted: () => void
  onSignIn: () => void
}

const { width, height } = Dimensions.get('window')

const LandingScreen: React.FC<LandingScreenProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../../assets/memo-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Record. Pin. Remember.</Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Voice Memories</Text>
            <Text style={styles.featureDescription}>
              Record audio memos and pin them to meaningful locations
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Discover Stories</Text>
            <Text style={styles.featureDescription}>
              Listen to audio memories left by others at special places
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Preserve Moments</Text>
            <Text style={styles.featureDescription}>
              Create lasting audio memories tied to the places that matter
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInButton} onPress={onSignIn}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          Join thousands of people creating{'\n'}audio memories around the world
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF1E8', // Lighter version of sandy orange (#F4A261)
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Math.max(20, height * 0.02), // Responsive top padding
    paddingBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Math.max(30, height * 0.04), // Responsive margin
  },
  logoImage: {
    width: Math.min(320, width * 0.8), // Increased from 250 to 320
    height: Math.min(130, height * 0.15), // Increased from 100 to 130
    marginBottom: 16,
  },
  tagline: {
    fontSize: Math.min(18, width * 0.045), // Responsive font size
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  featuresContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: Math.max(12, height * 0.015), // Responsive gap
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    padding: Math.max(18, height * 0.022), // Responsive padding
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center', // Center align all content in cards
  },
  featureTitle: {
    fontSize: Math.min(18, width * 0.045), // Responsive font size
    fontWeight: 'bold',
    color: '#264653',
    marginBottom: 6,
    textAlign: 'center', // Center align title text
  },
  featureDescription: {
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    color: '#6B7280',
    lineHeight: Math.min(20, width * 0.05),
    textAlign: 'center', // Center align description text
  },
  buttonContainer: {
    marginTop: Math.max(20, height * 0.025), // Responsive margin
    gap: 12,
  },
  getStartedButton: {
    backgroundColor: '#264653',
    paddingVertical: Math.max(14, height * 0.018), // Responsive padding
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  signInButton: {
    borderWidth: 2,
    borderColor: '#2A9D8F',
    paddingVertical: Math.max(14, height * 0.018), // Responsive padding
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  signInButtonText: {
    color: '#2A9D8F',
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    color: '#6B7280',
    marginTop: Math.max(16, height * 0.02), // Responsive margin
    lineHeight: Math.min(20, width * 0.05),
  },
})

export default LandingScreen 