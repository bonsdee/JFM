import { create } from 'zustand'

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v) } catch { return fallback }
}
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

/** Light UI state: sidebar, mobile drawer, theme, command palette. */
export const useUiStore = create((set, get) => ({
  sidebarCollapsed: read('jfm-sidebar-collapsed', false),
  mobileNavOpen: false,
  paletteOpen: false,
  theme: (() => { try { return localStorage.getItem('jfm-theme') || 'light' } catch { return 'light' } })(),

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    write('jfm-sidebar-collapsed', next)
    set({ sidebarCollapsed: next })
  },
  setMobileNav: (open) => set({ mobileNavOpen: open }),
  setPalette: (open) => set({ paletteOpen: open }),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('jfm-theme', next) } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', next === 'dark')
    set({ theme: next })
  },
}))
