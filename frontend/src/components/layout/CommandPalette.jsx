import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Boxes, CornerDownLeft, Printer, Search, User } from 'lucide-react'
import { NAV, QUICK_ACTIONS } from './nav'
import { useUiStore } from '@/stores/uiStore'
import { get } from '@/lib/api'
import { peso } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Ctrl/Cmd+K: jump to pages, quick actions, and live-search products, jobs and customers. */
export function CommandPalette() {
  const { paletteOpen: open, setPalette } = useUiStore()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const term = q.trim()

  const { data: remote } = useQuery({
    queryKey: ['palette', term],
    enabled: open && term.length >= 2,
    staleTime: 10_000,
    queryFn: async () => {
      const [products, jobs, customers] = await Promise.all([
        get('/products/options', { q: term, limit: 5 }),
        get('/job-orders', { q: term, size: 4 }).then((p) => p.content),
        get('/customers', { q: term, size: 4 }).then((p) => p.content),
      ])
      return { products, jobs, customers }
    },
  })

  const results = useMemo(() => {
    const t = term.toLowerCase()
    const pages = NAV.flatMap((g) => g.items).map((i) => ({ ...i, group: 'Pages' }))
    const actions = QUICK_ACTIONS.map((a) => ({ ...a, group: 'Actions' }))
    const local = [...actions, ...pages].filter((i) => !t || `${i.label} ${i.keywords || ''} ${i.search || ''}`.toLowerCase().includes(t))
    const list = t ? local : local.slice(0, 8)
    if (remote) {
      remote.products.forEach((p) => list.push({ group: 'Products', label: p.name, hint: `${p.sku} · ${peso(p.sellingPrice)}`, icon: Boxes, to: `/app/inventory/products/${p.id}` }))
      remote.jobs.forEach((j) => list.push({ group: 'Job orders', label: `${j.jobNumber} — ${j.customerName}`, hint: j.status.replace(/_/g, ' ').toLowerCase(), icon: Printer, to: `/app/jobs/${j.id}` }))
      remote.customers.forEach((c) => list.push({ group: 'Customers', label: c.name, hint: c.phone, icon: User, to: `/app/customers/${c.id}` }))
    }
    return list
  }, [term, remote])

  useEffect(() => { setActive(0) }, [term])
  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 20) }
  }, [open])

  const go = (item) => { setPalette(false); navigate(item.to) }

  const onKey = (e) => {
    if (e.key === 'Escape') setPalette(false)
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && results[active]) go(results[active])
  }

  let lastGroup = null
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKey}>
          <motion.div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPalette(false)} />
          <motion.div
            role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="relative w-full max-w-xl overflow-hidden rounded-card border border-line bg-surface shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="h-5 w-5 text-muted" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a page, product, job number or customer…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={`palette-${active}`}
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
            </div>
            <ul id="palette-list" role="listbox" className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No matches for “{term}”.</li>}
              {results.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null
                lastGroup = item.group
                const Icon = item.icon
                return (
                  <li key={`${item.group}-${item.to}-${i}`}>
                    {header && <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted">{header}</p>}
                    <button
                      id={`palette-${i}`}
                      role="option"
                      aria-selected={i === active}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', i === active ? 'bg-primary-50 text-primary-700 dark:bg-primary/15 dark:text-white' : 'text-ink')}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint && <span className="truncate text-xs text-muted">{item.hint}</span>}
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5 opacity-60" aria-hidden />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
