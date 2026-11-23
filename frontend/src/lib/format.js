/** Formatting helpers — Philippine Peso and Asia/Manila time everywhere. */

export const TZ = 'Asia/Manila'

const pesoFmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 })
const pesoCompact = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1 })
const numFmt = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 })

/** ₱1,234.50 */
export function peso(value) {
  const n = Number(value ?? 0)
  return pesoFmt.format(Number.isFinite(n) ? n : 0)
}

/** ₱12.3K — for chart axes. */
export function pesoShort(value) {
  return pesoCompact.format(Number(value ?? 0))
}

export function num(value) {
  return numFmt.format(Number(value ?? 0))
}

export function pct(value, digits = 1) {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(digits)}%`
}

const dateFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
const shortFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const toDate = (v) => (v instanceof Date ? v : new Date(String(v).length === 10 ? `${v}T00:00:00+08:00` : v))

export const fmtDate = (v) => (v ? dateFmt.format(toDate(v)) : '—')
export const fmtDateTime = (v) => (v ? dateTimeFmt.format(toDate(v)) : '—')
export const fmtTime = (v) => (v ? timeFmt.format(toDate(v)) : '—')
export const fmtShort = (v) => (v ? shortFmt.format(toDate(v)) : '—')

/** "in 3h", "2d ago" */
export function relative(v) {
  if (!v) return '—'
  const diff = toDate(v).getTime() - Date.now()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const units = [['day', 86400000], ['hour', 3600000], ['minute', 60000]]
  for (const [unit, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), unit)
  return 'just now'
}

/** Today in Manila as YYYY-MM-DD. */
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

export function isoDaysAgo(days) {
  const d = new Date(`${todayISO()}T00:00:00+08:00`)
  d.setDate(d.getDate() - days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

export function monthStartISO() {
  return `${todayISO().slice(0, 8)}01`
}

/** Local date (YYYY-MM-DD) → ISO instant at Manila midnight; end=true gives next midnight. */
export function dayStartInstant(iso, end = false) {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00+08:00`)
  if (end) d.setDate(d.getDate() + 1)
  return d.toISOString()
}

/** datetime-local input value (Manila) ⇄ ISO instant */
export function toLocalInput(v) {
  if (!v) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(toDate(v)).reduce((a, p) => ({ ...a, [p.type]: p.value }), {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
export function fromLocalInput(v) {
  return v ? new Date(`${v}:00+08:00`).toISOString() : null
}

export const humanize = (s) => (s ? String(s).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '')
