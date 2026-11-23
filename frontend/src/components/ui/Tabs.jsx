import { motion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '@/lib/cn'

/** Underlined tabs with an animated bubble indicator. tabs: [{ value, label, count? }] */
export function Tabs({ tabs, value, onChange, className }) {
  const layoutId = useId()
  return (
    <div role="tablist" className={cn('scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1', className)}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn('relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition', active ? 'text-primary-700 dark:text-white' : 'text-muted hover:text-ink')}
          >
            {active && (
              <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-primary-50 ring-1 ring-primary-200 dark:bg-primary/20 dark:ring-primary/30" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
            )}
            <span className="relative flex items-center gap-2">
              {t.label}
              {t.count !== undefined && <span className="tabular rounded-full bg-surface px-1.5 text-[11px] text-muted ring-1 ring-line">{t.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
