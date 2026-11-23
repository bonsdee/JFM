import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

/**
 * Click-to-open menu. items: [{ label, icon?, onClick, danger?, divider? }]
 * trigger: render prop receiving { open, toggle }.
 */
export function Dropdown({ trigger, items, align = 'right', className, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={cn('absolute z-40 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lift', align === 'right' ? 'right-0' : 'left-0', className)}
          >
            {children}
            {items?.map((item, i) =>
              item.divider ? (
                <div key={i} className="my-1 h-px bg-line" />
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  type="button"
                  onClick={() => { setOpen(false); item.onClick?.() }}
                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-subtle', item.danger ? 'text-danger' : 'text-ink')}
                >
                  {item.icon && <item.icon className="h-4 w-4 text-muted" aria-hidden />}
                  {item.label}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
