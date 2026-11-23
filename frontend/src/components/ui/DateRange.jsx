import { CalendarDays } from 'lucide-react'
import { isoDaysAgo, monthStartISO, todayISO } from '@/lib/format'
import { cn } from '@/lib/cn'

export const RANGE_PRESETS = [
  { key: 'today', label: 'Today', range: () => [todayISO(), todayISO()] },
  { key: '7d', label: '7 days', range: () => [isoDaysAgo(6), todayISO()] },
  { key: '30d', label: '30 days', range: () => [isoDaysAgo(29), todayISO()] },
  { key: 'month', label: 'This month', range: () => [monthStartISO(), todayISO()] },
  {
    key: 'lastMonth',
    label: 'Last month',
    range: () => {
      const start = new Date(`${monthStartISO()}T00:00:00+08:00`)
      start.setMonth(start.getMonth() - 1)
      const end = new Date(`${monthStartISO()}T00:00:00+08:00`)
      end.setDate(end.getDate() - 1)
      const f = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d)
      return [f(start), f(end)]
    },
  },
  { key: '90d', label: '90 days', range: () => [isoDaysAgo(89), todayISO()] },
]

/** Date range with quick presets. value: { from, to } as YYYY-MM-DD. */
export function DateRangePicker({ value, onChange, className, presets = RANGE_PRESETS }) {
  const activeKey = presets.find((p) => { const [f, t] = p.range(); return f === value.from && t === value.to })?.key
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
        <CalendarDays className="h-4 w-4 text-muted" aria-hidden />
        <input type="date" aria-label="From date" value={value.from || ''} max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })} className="bg-transparent text-sm text-ink outline-none" />
        <span className="text-muted">–</span>
        <input type="date" aria-label="To date" value={value.to || ''} min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })} className="bg-transparent text-sm text-ink outline-none" />
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button key={p.key} type="button" onClick={() => { const [from, to] = p.range(); onChange({ from, to }) }}
            className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition', activeKey === p.key ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200 dark:bg-primary/20 dark:text-white' : 'text-muted hover:bg-subtle hover:text-ink')}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
