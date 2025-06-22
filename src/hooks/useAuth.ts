import { useState, useEffect } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { DatabaseService } from '../services/database'
import { AuthHook, AuthResponse, SignupData, UserProfile, AuthState } from '../types/auth'

export function useAuth(): AuthHook {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    console.log('🔐 useAuth: Initializing authentication...')
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('✅ Found existing session for user:', session.user.email)
          setUser(session.user)
          
          // Only fetch profile if user is email confirmed
          if (session.user.email_confirmed_at) {
            console.log('📧 Email confirmed, fetching user profile...')
            await fetchUserProfile(session.user.id)
          } else {
            console.log('⏳ Email not confirmed yet')
          }
        } else {
          console.log('🚫 No existing session found')
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email)
        
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in:', session.user.email)
          
          // Check if email is confirmed
          if (session.user.email_confirmed_at) {
            console.log('📧 Email confirmed, fetching profile...')
            await fetchUserProfile(session.user.id)
          } else {
            console.log('⏳ Email not confirmed yet, waiting...')
            setUserProfile(null)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
          setUserProfile(null)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token refreshed for:', session.user.email)
          
          // Check if email was just confirmed
          if (session.user.email_confirmed_at && !userProfile) {
            console.log('📧 Email just confirmed! Fetching profile...')
            await fetchUserProfile(session.user.id)
          }
        }
        
        setLoading(false)
      }
    )

    return () => {
      console.log('🧹 Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [])

  // Helper function to fetch user profile from our custom users table
  const fetchUserProfile = async (userId: string): Promise<void> => {
    try {
      console.log('📊 Fetching user profile for:', userId)
      const { data: profile, error } = await DatabaseService.getUserProfile(userId)
      
      if (error) {
        console.error('❌ Error fetching user profile:', error)
        setUserProfile(null)
      } else if (profile) {
        console.log('✅ User profile loaded:', profile.username)
        setUserProfile(profile)
      } else {
        console.log('🚫 No profile found for user')
        setUserProfile(null)
      }
    } catch (error) {
      console.error('❌ Exception fetching user profile:', error)
      setUserProfile(null)
    }
  }

  const signInWithEmail = async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
    const input = emailOrUsername.trim()
    console.log('🔑 Attempting to sign in with:', input)
    
    try {
      let loginEmail = input
      
      // Check if input is email format (contains @ and .)
      const isEmail = input.includes('@') && input.includes('.')
      
      if (!isEmail) {
        // Input appears to be a username, look up the email
        console.log('🔍 Input appears to be username, looking up email...')
        
        const { email, error: emailLookupError } = await DatabaseService.getEmailByUsername(input)
        
        if (emailLookupError || !email) {
          console.error('❌ Username lookup failed:', emailLookupError?.message)
          return { 
            data: null, 
            error: {
              message: emailLookupError?.message || 'Username not found. Please check your username or use your email address.',
              name: 'UsernameNotFound',
              status: 400
            } as AuthError
          }
        }
        
        loginEmail = email
        console.log('✅ Found email for username')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.toLowerCase(),
        password,
      })

      if (error) {
        console.error('❌ Sign in error:', error.message)
        return { data: null, error }
      }

      if (data.user) {
        console.log('✅ Sign in successful for:', data.user.email)
        
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          console.log('⚠️ Email not confirmed yet')
          return { 
            data, 
            error: {
              message: 'Please check your email and click the confirmation link before signing in.',
              name: 'EmailNotConfirmed',
              status: 400
            } as AuthError
          }
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('❌ Sign in exception:', error)
      return { 
        data: null, 
        error: {
          message: 'An unexpected error occurred during sign in',
          name: 'SignInError',
          status: 500
        } as AuthError
      }
    }
  }

  const signUpWithEmail = async (signupData: SignupData): Promise<AuthResponse> => {
    console.log('📝 Attempting to sign up with email:', signupData.email)
    
    try {
      // Validate password confirmation
      if (signupData.password !== signupData.confirmPassword) {
        console.log('❌ Passwords do not match')
        return {
          data: null,
          error: {
            message: 'Passwords do not match',
            name: 'PasswordMismatchError',
            status: 400
          } as AuthError
        }
      }

      // Check if username is available
      console.log('🔍 Checking username availability:', signupData.username)
      const { available, error: usernameError } = await DatabaseService.isUsernameAvailable(
        signupData.username.toLowerCase().trim()
      )
      
      if (usernameError) {
        console.error('❌ Error checking username:', usernameError)
        return {
          data: null,
          error: {
            message: 'Error checking username availability. Please try again.',
            name: 'UsernameCheckError', 
            status: 500
          } as AuthError
        }
      }

      if (!available) {
        console.log('❌ Username already taken:', signupData.username)
        return {
          data: null,
          error: {
            message: 'Username is already taken. Please choose a different one.',
            name: 'UsernameTakenError',
            status: 400
          } as AuthError
        }
      }

      console.log('✅ Username available, creating account...')
      
      // Create auth user - the database trigger will automatically create the profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
        options: {
          data: {
            first_name: signupData.firstName.trim(),
            last_name: signupData.lastName.trim(),
            username: signupData.username.toLowerCase().trim(),
          }
        }
      })

      if (authError) {
        console.error('❌ Sign up error:', authError.message)
        return { data: null, error: authError }
      }

      if (authData.user) {
        console.log('✅ Sign up successful! Check email for confirmation.')
      }

      return { data: authData, error: null }
    } catch (error) {
      console.error('❌ Sign up exception:', error)
      return { 
        data: null, 
        error: {
          message: 'An unexpected error occurred during sign up',
          name: 'SignUpError',
          status: 500
        } as AuthError
      }
    }
  }

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    console.log('👋 Signing out user...')
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Sign out error:', error.message)
      } else {
        console.log('✅ Sign out successful')
      }
      
      return { error }
    } catch (error) {
      console.error('❌ Sign out exception:', error)
      return { 
        error: {
          message: 'An error occurred during sign out',
          name: 'SignOutError',
          status: 500
        } as AuthError
      }
    }
  }

  return {
    user,
    userProfile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
} 