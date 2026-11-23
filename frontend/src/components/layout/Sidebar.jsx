import { NavLink, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsLeft, X } from 'lucide-react'
import { NAV } from './nav'
import { Logo } from './Logo'
import { useUiStore } from '@/stores/uiStore'
import { useNotifications } from '@/features/admin'
import { cn } from '@/lib/cn'

function NavItems({ collapsed, onNavigate }) {
  const { data } = useNotifications()
  const inquiryCount = data?.items?.find((n) => n.type === 'NEW_INQUIRY') ? parseInt(data.items.find((n) => n.type === 'NEW_INQUIRY').title, 10) : 0

  return (
    <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV.map((group) => (
        <div key={group.label}>
          {!collapsed && <p className="mb-1.5 px-3 text-xs font-semibold text-muted/80">{group.label}</p>}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn('relative flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition',
                      collapsed && 'justify-center px-0',
                      isActive ? 'text-primary-700 dark:text-white' : 'text-muted hover:bg-subtle hover:text-ink')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-bubble"
                          className="absolute inset-0 rounded-full bg-primary-50 ring-1 ring-primary-100 dark:bg-primary/20 dark:ring-primary/30"
                          transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                        />
                      )}
                      <item.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive && 'text-primary')} aria-hidden />
                      {!collapsed && <span className="relative truncate">{item.label}</span>}
                      {item.badge === 'inquiries' && inquiryCount > 0 && (
                        <span className={cn('relative ml-auto rounded-full bg-accent px-1.5 text-[11px] font-bold text-white', collapsed && 'absolute right-2 top-1.5 ml-0')}>
                          {inquiryCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar, mobileNavOpen, setMobileNav } = useUiStore()

  return (
    <>
      {/* Desktop */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line/70 bg-surface transition-[width] duration-300 lg:flex', collapsed ? 'w-[84px]' : 'w-[264px]')}>
        <div className={cn('flex h-16 items-center border-b border-line/70 px-5', collapsed && 'justify-center px-0')}>
          <Link to="/app" aria-label="PrintHub dashboard"><Logo compact={collapsed} /></Link>
        </div>
        <NavItems collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleSidebar}
          className="m-3 flex items-center justify-center gap-2 rounded-full border border-line py-2 text-xs font-semibold text-muted hover:bg-subtle hover:text-ink"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} />
          {!collapsed && 'Collapse'}
        </button>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-slate-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 flex w-[280px] flex-col rounded-r-card bg-surface shadow-lift"
            >
              <div className="flex h-16 items-center justify-between border-b border-line/70 px-5">
                <Logo />
                <button type="button" onClick={() => setMobileNav(false)} className="rounded-full p-2 hover:bg-subtle" aria-label="Close menu"><X className="h-5 w-5" /></button>
              </div>
              <NavItems collapsed={false} onNavigate={() => setMobileNav(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
