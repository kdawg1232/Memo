import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'

interface AuthFormProps {
  initialMode?: 'login' | 'signup'
  onBack?: () => void
}

const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'login', onBack }) => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isLogin, setIsLogin] = useState<boolean>(initialMode === 'login')
  const [loading, setLoading] = useState<boolean>(false)
  
  const { signInWithEmail, signUpWithEmail } = useAuth()

  const handleSubmit = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    
    try {
      const { data, error } = isLogin
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password)

      if (error) {
        Alert.alert('Error', error.message)
      } else if (!isLogin) {
        Alert.alert('Success', 'Check your email for verification link')
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back option */}
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../../assets/memo-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#000000"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#000000"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchText}>
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF1E8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2A9D8F',
    fontWeight: '600',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 300,
    height: 150,
    marginBottom: 16,
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#264653',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6B7280',
  },
  input: {
    borderWidth: 2,
    borderColor: '#F4A261',
    backgroundColor: '#FFFFFF',
    padding: 18,
    marginBottom: 18,
    borderRadius: 16,
    fontSize: 16,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#F4A261',
  },
  button: {
    backgroundColor: '#264653',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#264653',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    color: '#2A9D8F',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default AuthForm 