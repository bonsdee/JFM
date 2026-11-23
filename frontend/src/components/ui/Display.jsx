import { Link } from 'react-router-dom'
import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'

const tones = {
  neutral: 'bg-subtle text-muted ring-line',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary/15 dark:text-primary dark:ring-primary/30',
  violet: 'bg-violet-100 text-violet-600 ring-violet-100 dark:bg-violet/15 dark:text-violet-300 dark:ring-violet/30',
  accent: 'bg-accent-100 text-accent-600 ring-accent-100 dark:bg-accent/15 dark:text-cyan-300 dark:ring-accent/30',
  success: 'bg-success-50 text-success-700 ring-emerald-100 dark:bg-success/15 dark:text-emerald-300 dark:ring-success/30',
  warning: 'bg-warning-50 text-warning-700 ring-amber-100 dark:bg-warning/15 dark:text-amber-300 dark:ring-warning/30',
  danger: 'bg-danger-50 text-danger-700 ring-red-100 dark:bg-danger/15 dark:text-red-300 dark:ring-danger/30',
}

/** Status pill. `dot` adds a leading color dot. */
export function Badge({ tone = 'neutral', children, dot = true, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />}
      {children}
    </span>
  )
}

export function Card({ className, children, ...props }) {
  return <div className={cn('card', className)} {...props}>{children}</div>
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-bold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** KPI card with optional change vs previous period. */
export function StatCard({ label, value, hint, change, icon: Icon, tone = 'primary', loading, to }) {
  const body = (
    <div className="card group relative h-full overflow-hidden p-5 transition hover:shadow-lift">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand opacity-[0.07] transition group-hover:scale-110" aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', tones[tone])}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="tabular mt-2 font-display text-[1.7rem] font-extrabold leading-tight tracking-tight">{value}</p>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
        {change !== undefined && change !== null && !loading && (
          <span className={cn('inline-flex items-center gap-0.5 font-semibold', change >= 0 ? 'text-success-700 dark:text-emerald-300' : 'text-danger-700 dark:text-red-300')}>
            {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {hint && <span className="truncate">{hint}</span>}
      </div>
    </div>
  )
  return to ? <Link to={to} className="block rounded-card">{body}</Link> : body
}

export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-subtle', className)} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/5" />
    </div>
  )
}

/** Friendly empty state with a bubble illustration and a call to action. */
export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="relative mb-5 h-24 w-24">
        <span className="absolute left-1 top-3 h-16 w-16 rounded-full bg-primary-100 dark:bg-primary/20" />
        <span className="absolute right-0 top-0 h-9 w-9 rounded-full bg-accent-100 dark:bg-accent/20" />
        <span className="absolute bottom-0 right-3 h-6 w-6 rounded-full bg-violet-100 dark:bg-violet/20" />
        {Icon && <Icon className="absolute left-6 top-8 h-7 w-7 text-primary" aria-hidden />}
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
            {item.to ? <Link to={item.to} className="hover:text-ink">{item.label}</Link> : <span className="text-ink">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="mb-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold sm:text-[1.75rem]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Label / value list for detail pages. */
export function DescriptionList({ items, className }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {items.filter(Boolean).map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium text-muted">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-ink">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
