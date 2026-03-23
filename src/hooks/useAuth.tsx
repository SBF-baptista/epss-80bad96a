
import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { logLogin, logLogout } from '@/services/logService'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LAST_SEEN_SYNC_INTERVAL_MS = 5 * 60 * 1000

const getLastSeenStorageKey = (userId: string) => `opm:last-seen:${userId}`

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const pendingLastSeenUpdates = useRef<Set<string>>(new Set())

  useEffect(() => {
    const shouldSyncLastSeen = (userId: string) => {
      try {
        const lastSyncedAt = window.localStorage.getItem(getLastSeenStorageKey(userId))
        if (!lastSyncedAt) return true

        return Date.now() - Number(lastSyncedAt) >= LAST_SEEN_SYNC_INTERVAL_MS
      } catch {
        return true
      }
    }

    const markLastSeenSynced = (userId: string) => {
      try {
        window.localStorage.setItem(getLastSeenStorageKey(userId), String(Date.now()))
      } catch {
        // Ignore storage errors and keep auth flow working
      }
    }

    const updateLastSeen = async (userId: string) => {
      if (!shouldSyncLastSeen(userId) || pendingLastSeenUpdates.current.has(userId)) {
        return
      }

      pendingLastSeenUpdates.current.add(userId)

      try {
        const now = new Date().toISOString()
        await supabase.from('user_last_seen').upsert(
          { user_id: userId, last_seen_at: now, updated_at: now },
          { onConflict: 'user_id' }
        )

        markLastSeenSynced(userId)
      } catch (e) {
        console.error('Failed to update last_seen:', e)
      } finally {
        pendingLastSeenUpdates.current.delete(userId)
      }
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Record last seen on any auth event with a valid session
        if (session?.user?.id && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          setTimeout(() => updateLastSeen(session.user.id), 500)
        }
      }
    )

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user?.id) {
        updateLastSeen(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Session timeout: 30min inactivity + 8hr absolute
  useEffect(() => {
    if (!session) return

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
    const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000 // 8 hours

    let inactivityTimer: ReturnType<typeof setTimeout>

    const handleAutoSignOut = async () => {
      try {
        await logLogout()
      } catch (e) {
        console.error('Auto sign-out log error (ignored):', e)
      }
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.error('Auto sign-out error (clearing local state):', e)
      }
      // Always clear local state
      setUser(null)
      setSession(null)
    }

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(handleAutoSignOut, INACTIVITY_TIMEOUT)
    }

    // Absolute session timeout
    const absoluteTimer = setTimeout(handleAutoSignOut, ABSOLUTE_TIMEOUT)

    // Track user activity for inactivity timeout
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(e => window.addEventListener(e, resetInactivityTimer))
    resetInactivityTimer()

    return () => {
      clearTimeout(inactivityTimer)
      clearTimeout(absoluteTimer)
      activityEvents.forEach(e => window.removeEventListener(e, resetInactivityTimer))
    }
  }, [session])

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/kanban`
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (!error) {
      setTimeout(() => {
        logLogin();
      }, 100);
    }
    
    return { error }
  }

  const signOut = async () => {
    // Try to log logout, but never let it block sign out
    try {
      await logLogout();
    } catch (e) {
      console.error('Logout log failed (ignored):', e)
    }
    
    // Always attempt sign out and clear local state regardless of errors
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Sign out API error (clearing local state):', e)
    }
    
    // Force clear local state
    setUser(null)
    setSession(null)
    
    return { error: null }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
