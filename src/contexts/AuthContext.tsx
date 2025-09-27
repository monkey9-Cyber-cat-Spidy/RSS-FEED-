import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, type UserProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  isAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  // Ensure a user_profiles row exists for the authenticated user (needed for FK on subscriptions)
  const ensureUserProfile = async (u: User): Promise<UserProfile | null> => {
    try {
      // Try to upsert a minimal profile; onConflict by id guarantees id/email uniqueness
      const email = u.email ?? ''
      const fallback = (email && email.includes('@')) ? email.split('@')[0] : (u.user_metadata?.username || 'user')
      const display = u.user_metadata?.display_name || fallback

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: u.id,
          email,
          username: u.user_metadata?.username || fallback,
          display_name: display,
        }, { onConflict: 'id' })
        .select('*')
        .single()

      if (error) {
        console.error('Error ensuring user profile:', error)
        return null
      }
      return data
    } catch (e) {
      console.error('Unexpected error ensuring user profile:', e)
      return null
    }
  }

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    // Don't manually set states here, let the auth state change handler do it
  }

  const isAdmin = () => {
    return profile?.role === 'admin'
  }

  useEffect(() => {
    let isMounted = true
    // Failsafe: never keep the UI stuck in loading forever
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth init is taking too long; forcing loading=false after timeout')
        setLoading(false)
      }
    }, 8000)

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          try {
            let p = await fetchUserProfile(session.user.id)
            if (!p) {
              // Attempt to create the missing profile so FK constraints on subscriptions won't fail
              p = await ensureUserProfile(session.user)
            }
            if (isMounted) setProfile(p)
          } catch (e) {
            console.error('Error loading/ensuring user profile during init:', e)
          }
        }
      } catch (e) {
        console.error('Error initializing auth session:', e)
      } finally {
        clearTimeout(timeoutId)
        if (isMounted) setLoading(false)
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        try {
          let userProfile = await fetchUserProfile(session.user.id)
          if (!userProfile) {
            userProfile = await ensureUserProfile(session.user)
          }
          setProfile(userProfile)
        } catch (e) {
          console.error('Error loading/ensuring user profile after auth change:', e)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      // Always set loading to false regardless of the event
      clearTimeout(timeoutId)
      setLoading(false)
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}