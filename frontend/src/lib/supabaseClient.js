import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const REMEMBER_KEY = 'jfm-remember'

/**
 * "Remember me" storage: when unchecked the session lives in sessionStorage and ends with the tab;
 * when checked it persists in localStorage. Wrapped in try/catch for private mode / blocked storage.
 */
const rememberAwareStorage = {
  getItem(key) {
    try { return localStorage.getItem(key) ?? sessionStorage.getItem(key) } catch { return null }
  },
  setItem(key, value) {
    try {
      const remember = localStorage.getItem(REMEMBER_KEY) !== 'false'
      ;(remember ? localStorage : sessionStorage).setItem(key, value)
      ;(remember ? sessionStorage : localStorage).removeItem(key)
    } catch { /* storage unavailable */ }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key) } catch { /* ignore */ }
  },
}

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: rememberAwareStorage,
    storageKey: 'jfm-auth',
  },
})

export function setRememberMe(remember) {
  try { localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false') } catch { /* ignore */ }
}
