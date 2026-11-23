import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore, signOut } from '@/stores/authStore'
import { Dropdown } from '@/components/ui/Dropdown'
import { NotificationsBell } from './NotificationsBell'

export function Topbar() {
  const { setMobileNav, setPalette, theme, toggleTheme } = useUiStore()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  const initial = (user?.email || 'O')[0].toUpperCase()

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" className="rounded-full p-2 hover:bg-subtle lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setPalette(true)}
          className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-sm text-muted transition hover:border-primary/40"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="flex-1 text-left">Search products, jobs, pages…</span>
          <kbd className="hidden rounded-md border border-line bg-subtle px-1.5 py-0.5 text-[11px] font-semibold sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={toggleTheme} className="rounded-full p-2.5 text-muted hover:bg-subtle hover:text-ink" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <NotificationsBell />
          <Dropdown
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white ring-4 ring-primary/10" aria-label="Profile menu">
                {initial}
              </button>
            )}
            items={[
              { label: 'Account & security', icon: User, onClick: () => navigate('/app/settings?tab=account') },
              { label: 'Settings', icon: Settings, onClick: () => navigate('/app/settings') },
              { divider: true },
              { label: 'Sign out', icon: LogOut, danger: true, onClick: async () => { await signOut(); navigate('/login') } },
            ]}
          >
            <div className="border-b border-line px-3 pb-2.5 pt-1.5">
              <p className="text-xs text-muted">Signed in as owner</p>
              <p className="truncate text-sm font-semibold">{user?.email}</p>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  )
}
