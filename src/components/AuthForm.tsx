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
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { SignupData } from '../types/auth'

interface AuthFormProps {
  initialMode?: 'login' | 'signup'
  onBack?: () => void
}

const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'login', onBack }) => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [isLogin, setIsLogin] = useState<boolean>(initialMode === 'login')
  const [loading, setLoading] = useState<boolean>(false)
  
  const { signInWithEmail, signUpWithEmail } = useAuth()

  // Helper function to validate form fields
  const validateForm = (): string | null => {
    // Clean and validate email/username
    const cleanInput = email.trim()
    if (!cleanInput) {
      return isLogin ? 'Email or username is required' : 'Email is required'
    }
    
    // For signup, validate email format
    if (!isLogin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(cleanInput)) {
        return 'Please enter a valid email address'
      }
    }
    // For login, we accept either email or username format

    // Password validation
    if (!password) {
      return 'Password is required'
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters'
    }

    // Signup-specific validations
    if (!isLogin) {
      if (!firstName.trim()) {
        return 'First name is required'
      }

      if (!lastName.trim()) {
        return 'Last name is required'
      }

      if (!username.trim()) {
        return 'Username is required'
      }

      if (firstName.trim().length < 2) {
        return 'First name must be at least 2 characters'
      }

      if (lastName.trim().length < 2) {
        return 'Last name must be at least 2 characters'
      }

      if (username.trim().length < 3) {
        return 'Username must be at least 3 characters'
      }

      // Username format validation - only letters, numbers, and underscores
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        return 'Username can only contain letters, numbers, and underscores'
      }

      if (!confirmPassword) {
        return 'Please confirm your password'
      }

      if (password !== confirmPassword) {
        return 'Passwords do not match'
      }
    }

    return null
  }

  const handleSubmit = async (): Promise<void> => {
    console.log(`🔑 ${isLogin ? 'Sign in' : 'Sign up'} attempt for:`, email)
    
    // Validate form
    const validationError = validateForm()
    if (validationError) {
      Alert.alert('Validation Error', validationError)
      return
    }

    setLoading(true)
    
    try {
      if (isLogin) {
        // Handle sign in (supports both email and username)
        const { data, error } = await signInWithEmail(email.trim(), password)
        
        if (error) {
          console.error('❌ Sign in failed:', error.message)
          Alert.alert('Sign In Failed', error.message)
        } else if (data?.user) {
          console.log('✅ Sign in successful')
          // Navigation will be handled automatically by the auth state change
        }
      } else {
        // Handle sign up
        const signupData: SignupData = {
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim().toLowerCase(),
        }

        const { data, error } = await signUpWithEmail(signupData)
        
        if (error) {
          console.error('❌ Sign up failed:', error.message)
          Alert.alert('Sign Up Failed', error.message)
        } else if (data?.user) {
          console.log('✅ Sign up successful')
          Alert.alert(
            'Account Created!', 
            'Please check your email and click the confirmation link to complete your registration. Once confirmed, you can sign in to start using the app.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Switch to login mode after successful signup
                  setIsLogin(true)
                  // Clear signup-specific fields
                  setConfirmPassword('')
                  setFirstName('')
                  setLastName('')
                  setUsername('')
                  // Keep email for convenience
                  setPassword('')
                }
              }
            ]
          )
        }
      }
    } catch (error) {
      console.error('❌ Authentication error:', error)
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to switch modes and clear form
  const switchMode = () => {
    console.log(`🔄 Switching from ${isLogin ? 'login' : 'signup'} to ${isLogin ? 'signup' : 'login'}`)
    
    setIsLogin(!isLogin)
    setLoading(false)
    
    // Clear all fields when switching modes
    setPassword('')
    setConfirmPassword('')
    setFirstName('')
    setLastName('')
    setUsername('')
    
    // Keep email for convenience when switching to login
    if (isLogin) {
      // Switching to signup, keep email
    } else {
      // Switching to login after signup, keep email
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header with back option */}
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}

          {/* Logo Section - Smaller for signup */}
          <View style={[styles.logoSection, !isLogin && styles.logoSectionCompact]}>
            <Image 
              source={require('../../assets/memo-logo.png')}
              style={[styles.logoImage, !isLogin && styles.logoImageCompact]}
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
            
            {/* Sign-up specific fields */}
            {!isLogin && (
              <>
                <View style={styles.nameRow}>
                  <TextInput
                    style={[styles.input, styles.nameInput, styles.inputCompact]}
                    placeholder="First Name"
                    placeholderTextColor="#808080"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={[styles.input, styles.nameInput, styles.inputCompact]}
                    placeholder="Last Name"
                    placeholderTextColor="#808080"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                
                <TextInput
                  style={[styles.input, styles.inputCompact]}
                  placeholder="Username"
                  placeholderTextColor="#808080"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}
            
            {/* Common fields */}
            <TextInput
              style={[styles.input, !isLogin && styles.inputCompact]}
              placeholder={isLogin ? "Email or Username" : "Email"}
              placeholderTextColor="#808080"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType={isLogin ? "default" : "email-address"}
              autoCorrect={false}
              autoComplete="email"
            />
            
            <TextInput
              style={[styles.input, !isLogin && styles.inputCompact]}
              placeholder="Password"
              placeholderTextColor="#808080"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isLogin ? "current-password" : "new-password"}
            />

            {/* Confirm password for signup */}
            {!isLogin && (
              <TextInput
                style={[styles.input, styles.inputCompact]}
                placeholder="Confirm Password"
                placeholderTextColor="#808080"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            )}
            
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
              onPress={switchMode}
              disabled={loading}
            >
              <Text style={styles.switchText}>
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoSectionCompact: {
    marginBottom: 20,
  },
  logoImage: {
    width: 280,
    height: 140,
    marginBottom: 10,
  },
  logoImageCompact: {
    width: 220,
    height: 110,
    marginBottom: 5,
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#000000',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    color: '#808080',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  nameInput: {
    width: '48%',
  },
  input: {
    borderWidth: 2,
    borderColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
    borderRadius: 14,
    fontSize: 16,
    color: '#000000',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  inputCompact: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#808080',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  switchText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
})

export default AuthForm 