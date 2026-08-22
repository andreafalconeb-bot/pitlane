import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile, Role } from '@/types'

interface AuthState {
  loading: boolean
  userId: string | null
  profile: Profile | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role: Role) => Promise<void>
  signOut: () => Promise<void>
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) return null
  return data as Profile
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  userId: null,
  profile: null,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id ?? null
    const profile = userId ? await loadProfile(userId) : null
    set({ userId, profile, loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user.id ?? null
      const p = id ? await loadProfile(id) : null
      set({ userId: id, profile: p })
    })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signUp: async (email, password, name, role) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ userId: null, profile: null })
  },
}))
