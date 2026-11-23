import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/cn'

/** App shell: collapsible sidebar, top bar, animated page outlet, global Ctrl/Cmd+K. */
import { ProtectedRoute } from '@/app/ProtectedRoute'

export default function AppLayoutGate() {
  return <ProtectedRoute><AppLayout /></ProtectedRoute>
}

function AppLayout() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const setPalette = useUiStore((s) => s.setPalette)
  const setMobileNav = useUiStore((s) => s.setMobileNav)
  const location = useLocation()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPalette])

  useEffect(() => setMobileNav(false), [location.pathname, setMobileNav])

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <Sidebar />
      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[84px]' : 'lg:pl-[264px]')}>
        <Topbar />
        <main id="main" className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
