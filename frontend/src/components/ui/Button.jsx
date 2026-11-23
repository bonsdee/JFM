import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const variants = {
  primary: 'bg-brand text-white shadow-[0_6px_20px_-6px_rgb(99_102_241/0.55)] hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface text-ink border border-line hover:bg-subtle',
  ghost: 'text-ink hover:bg-subtle',
  soft: 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary/15 dark:text-primary',
  danger: 'bg-danger text-white hover:brightness-110',
  'danger-soft': 'bg-danger-50 text-danger-700 hover:bg-red-100 dark:bg-danger/15 dark:text-red-300',
  success: 'bg-success text-white hover:brightness-110',
}

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',
}

/** Pill button with variants, sizes and a loading state (keeps width stable). */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-4 w-4" aria-hidden /> : null}
    </button>
  )
})
