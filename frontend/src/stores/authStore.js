import { create } from 'zustand'
import { supabase } from '@/lib/supabaseClient'

/**
 * Supabase session mirror. `ready` flips true once the persisted session has been read,
 * so ProtectedRoute never redirects before we know whether the owner is signed in.
 */
export const useAuthStore = create((set) => ({
  session: null,
  user: null,
  ready: false,
  setSession: (session) => set({ session, user: session?.user ?? null, ready: true }),
}))

let initialized = false

export function initAuth() {
  if (initialized) return
  initialized = true
  supabase.auth.getSession().then(({ data }) => useAuthStore.getState().setSession(data.session))
  supabase.auth.onAuthStateChange((_event, session) => useAuthStore.getState().setSession(session))
}

export async function signOut() {
  await supabase.auth.signOut()
  useAuthStore.getState().setSession(null)
}

// Start listening as soon as any auth-aware chunk loads.
initAuth()
