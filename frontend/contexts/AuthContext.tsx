"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User, FREE_TIER_LIMITS } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  hasOwnKeys: boolean
  queriesRemaining: number
  pdfsRemaining: number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user has their own API keys in localStorage
  const hasOwnKeys = Boolean(
    typeof window !== 'undefined' &&
    localStorage.getItem('userGoogleKey') &&
    localStorage.getItem('userCohereKey')
  )

  const queriesRemaining = user
    ? Math.max(0, (user.max_queries || FREE_TIER_LIMITS.MAX_QUERIES) - user.queries_used)
    : 0

  const pdfsRemaining = user
    ? Math.max(0, (user.max_pdfs || FREE_TIER_LIMITS.MAX_PDF_UPLOADS) - user.pdfs_uploaded)
    : 0

  // Fetch user data from our database
  const fetchUserData = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', supabaseUser.id)
        .single()

      if (error) {
        // User doesn't exist in our database yet, create them
        if (error.code === 'PGRST116') {
          const newUser = {
            google_id: supabaseUser.id,
            email: supabaseUser.email!,
            name: supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.name || null,
            photo_url: supabaseUser.user_metadata.avatar_url || supabaseUser.user_metadata.picture || null,
            queries_used: 0,
            pdfs_uploaded: 0,
            has_own_keys: false,
            max_queries: FREE_TIER_LIMITS.MAX_QUERIES,
            max_pdfs: FREE_TIER_LIMITS.MAX_PDF_UPLOADS,
          }

          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single()

          if (createError) throw createError
          setUser(createdUser)
        } else {
          throw error
        }
      } else {
        setUser(data)
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        fetchUserData(session.user)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        fetchUserData(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    })
    if (error) console.error('Error signing in:', error)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error signing out:', error)
    setUser(null)
    setSupabaseUser(null)

    // Clear all app state from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pdfUploaded')
      localStorage.removeItem('currentPdfName')
      localStorage.removeItem('chatMessages')
    }
  }

  const refreshUser = async () => {
    if (supabaseUser) {
      await fetchUserData(supabaseUser)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        signIn,
        signOut,
        refreshUser,
        hasOwnKeys,
        queriesRemaining,
        pdfsRemaining,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
