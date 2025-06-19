import { User, AuthError } from '@supabase/supabase-js'

export interface AuthResponse {
  data: any
  error: AuthError | null
}

export interface AuthHook {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<AuthResponse>
  signUpWithEmail: (email: string, password: string) => Promise<AuthResponse>
  signOut: () => Promise<{ error: AuthError | null }>
} 