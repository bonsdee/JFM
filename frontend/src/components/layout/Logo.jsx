import { cn } from '@/lib/cn'

/** Bubble mark + wordmark. */
export function Logo({ compact = false, className, light = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-[14px] bg-brand shadow-[0_6px_16px_-6px_rgb(99_102_241/0.7)]">
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="font-display text-sm font-extrabold text-white">J</span>
      </span>
      {!compact && (
        <span className={cn('font-display text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>
          JFM <span className="font-semibold text-muted">PrintHub</span>
        </span>
      )}
    </span>
  )
}
