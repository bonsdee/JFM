import { forwardRef, useId } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-input border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted/70 transition ' +
  'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12 disabled:bg-subtle disabled:text-muted'

/** Label + control + hint/error wrapper. Pass the control as children. */
export function Field({ label, hint, error, required, htmlFor, className, children, aside }) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </label>
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ className, invalid, prefix, suffix, ...props }, ref) {
  if (prefix || suffix) {
    return (
      <div className={cn('relative flex items-center', className)}>
        {prefix && <span className="pointer-events-none absolute left-3.5 text-sm text-muted">{prefix}</span>}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(control, 'h-10', prefix && 'pl-8', suffix && 'pr-12', invalid && 'border-danger focus:border-danger focus:ring-danger/15')}
          {...props}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 text-sm text-muted">{suffix}</span>}
      </div>
    )
  }
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-10', invalid && 'border-danger focus:border-danger focus:ring-danger/15', className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className, invalid, options, placeholder, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-10 appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', invalid && 'border-danger', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
    </select>
  )
})

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(control, 'py-2.5 leading-relaxed', invalid && 'border-danger', className)}
      {...props}
    />
  )
})

/** Accessible switch. */
export function Toggle({ checked, onChange, label, description, disabled, id }) {
  const autoId = useId()
  const toggleId = id || autoId
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <label htmlFor={toggleId} className="min-w-0 cursor-pointer">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </label>
      )}
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
          checked ? 'bg-brand' : 'bg-line',
          disabled && 'opacity-50',
        )}
      >
        <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className, autoFocus }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(control, 'h-10 rounded-full pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:text-ink" aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/** Segmented control (₱ / %, B&W / color, 7d / 30d / 12m). */
export function Segmented({ value, onChange, options, size = 'md', className }) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-full border border-line bg-subtle p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full font-semibold transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
