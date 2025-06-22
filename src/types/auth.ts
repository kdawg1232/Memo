import { User, AuthError } from '@supabase/supabase-js'

// User profile interface that matches our database schema
export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  username: string
  profile_picture_url?: string | null
  created_at: string
  updated_at: string
}

// Signup form data interface
export interface SignupData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  username: string
}

// Login form data interface  
export interface LoginData {
  email: string
  password: string
}

// Response interface for auth operations
export interface AuthResponse {
  data: any
  error: AuthError | null
}

// Main auth hook interface
export interface AuthHook {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signInWithEmail: (emailOrUsername: string, password: string) => Promise<AuthResponse>
  signUpWithEmail: (signupData: SignupData) => Promise<AuthResponse>
  signOut: () => Promise<{ error: AuthError | null }>
  refreshUserProfile: () => Promise<void>
}

// Auth state enum for better state management
export enum AuthState {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated', 
  UNAUTHENTICATED = 'unauthenticated',
  EMAIL_UNCONFIRMED = 'email_unconfirmed'
} 