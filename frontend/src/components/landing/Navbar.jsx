import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Menu, X } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/cn'

export const LANDING_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#how', label: 'How it works' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className={cn('fixed inset-x-0 top-0 z-40 transition-all duration-300', scrolled ? 'py-2' : 'py-4')}>
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 transition-all duration-300 sm:px-5',
          scrolled ? 'mx-3 h-14 border border-white/60 bg-white/70 shadow-soft backdrop-blur-xl dark:border-line dark:bg-surface/70 sm:mx-auto' : 'h-16',
        )}
      >
        <a href="#top" aria-label="JFM PrintHub home"><Logo /></a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {LANDING_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-white/70 hover:text-ink dark:hover:bg-subtle">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 dark:bg-white dark:text-slate-900 sm:inline-flex"
          >
            <Lock className="h-3.5 w-3.5" /> Owner Login
          </Link>
          <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-white/70 md:hidden" aria-label="Open menu" aria-expanded={open}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.nav
              aria-label="Mobile"
              initial={{ y: -24, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute inset-x-3 top-3 rounded-card bg-surface p-4 shadow-lift"
            >
              <div className="mb-2 flex items-center justify-between">
                <Logo />
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-subtle" aria-label="Close menu"><X className="h-5 w-5" /></button>
              </div>
              <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
                {LANDING_LINKS.map((l) => (
                  <motion.li key={l.href} variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}>
                    <a href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-base font-semibold hover:bg-subtle">{l.label}</a>
                  </motion.li>
                ))}
              </motion.ul>
              <Link to="/login" className="mt-3 flex items-center justify-center gap-2 rounded-full bg-brand py-3 font-semibold text-white">
                <Lock className="h-4 w-4" /> Owner Login
              </Link>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </header>
  )
}
