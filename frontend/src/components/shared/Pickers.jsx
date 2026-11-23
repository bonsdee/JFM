import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Package, User, X } from 'lucide-react'
import { useProductOptions } from '@/features/products'
import { useCustomers } from '@/features/customers'
import { UNIT_LABEL } from '@/lib/constants'
import { num, peso } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Generic async combobox: type to search, arrow keys + Enter to pick. */
function Combobox({ value, onSearch, results, loading, onSelect, renderItem, placeholder, display, onClear, icon: Icon, invalid, autoFocus }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef(null)

  useEffect(() => { onSearch(q) }, [q, onSearch])
  useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (item) => { onSelect(item); setOpen(false); setQ('') }

  return (
    <div ref={ref} className="relative">
      <div className={cn('flex h-10 items-center gap-2 rounded-input border bg-surface px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/12', invalid ? 'border-danger' : 'border-line')}>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />}
        <input
          value={open ? q : display || ''}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, (results?.length || 1) - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            if (e.key === 'Enter' && open && results?.[active]) { e.preventDefault(); pick(results[active]) }
            if (e.key === 'Escape') setOpen(false)
          }}
          role="combobox"
          aria-expanded={open}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
        {value && onClear ? (
          <button type="button" onClick={onClear} className="rounded-full p-0.5 text-muted hover:text-ink" aria-label="Clear selection"><X className="h-4 w-4" /></button>
        ) : <ChevronDown className="h-4 w-4 text-muted" aria-hidden />}
      </div>
      {open && (
        <ul role="listbox" className="scrollbar-thin absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift">
          {loading && !results?.length && <li className="px-3 py-3 text-sm text-muted">Searching…</li>}
          {!loading && !results?.length && <li className="px-3 py-3 text-sm text-muted">No matches</li>}
          {results?.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => pick(item)}
                className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm', i === active && 'bg-primary-50 dark:bg-primary/15')}>
                {renderItem(item)}
                {value === item.id && <Check className="ml-auto h-4 w-4 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Search products (optionally only materials). onChange receives the full option object. */
export function ProductPicker({ value, onChange, material, placeholder = 'Search product or SKU…', invalid, autoFocus, initialLabel }) {
  const [q, setQ] = useState('')
  const [label, setLabel] = useState(initialLabel || '')
  const { data, isFetching } = useProductOptions(q, material)
  useEffect(() => { if (initialLabel) setLabel(initialLabel) }, [initialLabel])
  return (
    <Combobox
      value={value}
      onSearch={setQ}
      results={data}
      loading={isFetching}
      display={label}
      placeholder={placeholder}
      icon={Package}
      invalid={invalid}
      autoFocus={autoFocus}
      onSelect={(p) => { setLabel(`${p.name} (${p.sku})`); onChange(p) }}
      renderItem={(p) => (
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{p.name}</span>
          <span className="tabular block text-xs text-muted">{p.sku} · {num(p.stockOnHand)} {UNIT_LABEL[p.unit]} on hand{p.material ? ' · material' : ` · ${peso(p.sellingPrice)}`}</span>
        </span>
      )}
    />
  )
}

/** Search customers; walk-in when empty. */
export function CustomerPicker({ value, onChange, placeholder = 'Walk-in customer (search to link)', initialLabel }) {
  const [q, setQ] = useState('')
  const [label, setLabel] = useState(initialLabel || '')
  const { data, isFetching } = useCustomers({ q, size: 8 })
  useEffect(() => { setLabel(initialLabel || '') }, [initialLabel])
  return (
    <Combobox
      value={value}
      onSearch={setQ}
      results={data?.content}
      loading={isFetching}
      display={label}
      placeholder={placeholder}
      icon={User}
      onClear={() => { setLabel(''); onChange(null) }}
      onSelect={(c) => { setLabel(c.name); onChange(c) }}
      renderItem={(c) => (
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{c.name}</span>
          <span className="block text-xs text-muted">{[c.phone, c.facebookName].filter(Boolean).join(' · ') || 'No contact info'}</span>
        </span>
      )}
    />
  )
}
