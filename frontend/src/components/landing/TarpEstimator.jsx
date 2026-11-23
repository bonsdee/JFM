import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, Zap } from 'lucide-react'
import { SectionHeading } from './Sections'
import { AnimatedNumber } from './motion'
import { usePublicQuote } from '@/features/publicSite'
import { peso } from '@/lib/format'
import { cn } from '@/lib/cn'

const MAX_FT = 20

function Stepper({ label, value, onChange, min = 1, max = MAX_FT, step = 1, unit }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, Math.round(v * 2) / 2)))
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink" htmlFor={`est-${label}`}>{label}</label>
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface p-1.5">
        <button type="button" onClick={() => set(value - step)} className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-ink transition hover:bg-line" aria-label={`Decrease ${label}`}><Minus className="h-4 w-4" /></button>
        <input
          id={`est-${label}`}
          type="number"
          inputMode="decimal"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => set(Number(e.target.value) || min)}
          className="tabular w-full bg-transparent text-center text-lg font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="pr-1 text-sm text-muted">{unit}</span>
        <button type="button" onClick={() => set(value + step)} className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-ink transition hover:bg-line" aria-label={`Increase ${label}`}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

/**
 * Live tarpaulin estimator. The tarp is drawn to scale as you type. The price shown is computed by the
 * backend's shared pricing engine (/api/public/quote) — identical to POS and job orders. While a request
 * is in flight, a local preview using the same published rate keeps the number moving.
 */
export function TarpEstimator({ service, heading = {} }) {
  const [w, setW] = useState(3)
  const [h, setH] = useState(5)
  const [qty, setQty] = useState(1)
  const [rush, setRush] = useState(false)
  const quote = usePublicQuote()
  const [serverTotal, setServerTotal] = useState(null)

  const rate = Number(service?.startingPrice ?? 15)
  const min = Number(service?.minCharge ?? 150)
  const rushPct = Number(service?.rushFeePercent ?? 25)

  const local = useMemo(() => {
    const per = Math.max(w * h * rate, min)
    const base = per * qty
    return base + (rush ? (base * rushPct) / 100 : 0)
  }, [w, h, qty, rush, rate, min, rushPct])

  useEffect(() => {
    const t = setTimeout(() => {
      quote.mutate(
        { serviceSlug: service?.slug || 'tarpaulin', widthFt: w, heightFt: h, quantity: qty, rush },
        { onSuccess: (d) => setServerTotal(Number(d.total)), onError: () => setServerTotal(null) },
      )
    }, 280)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, qty, rush, service?.slug])

  const total = serverTotal ?? local
  const area = w * h
  const minApplied = area * rate < min

  // Scale drawing to a 100×64 viewport while keeping aspect ratio.
  const scale = Math.min(88 / w, 52 / h)
  const dw = w * scale, dh = h * scale
  const x = (100 - dw) / 2, y = (64 - dh) / 2

  return (
    <section id="pricing" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading title={heading.title} subtitle={heading.subtitle || `${peso(rate)} per square foot, ${peso(min)} minimum per tarp. Add a rush for same-day release.`} />

        <div className="mt-12 grid overflow-hidden rounded-[32px] border border-line/70 bg-surface shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6 p-6 sm:p-10">
            <div className="grid grid-cols-2 gap-4">
              <Stepper label="Width" value={w} onChange={setW} unit="ft" step={0.5} />
              <Stepper label="Height" value={h} onChange={setH} unit="ft" step={0.5} />
            </div>
            <Stepper label="Quantity" value={qty} onChange={setQty} min={1} max={100} unit="pcs" />
            <button
              type="button"
              role="switch"
              aria-checked={rush}
              onClick={() => setRush(!rush)}
              className={cn('flex w-full items-center justify-between rounded-[22px] border px-5 py-4 text-left transition', rush ? 'border-primary-200 bg-primary-50/60 dark:border-primary/40 dark:bg-primary/10' : 'border-line hover:bg-subtle')}
            >
              <span>
                <span className="flex items-center gap-2 font-semibold"><Zap className={cn('h-4 w-4', rush ? 'text-primary' : 'text-muted')} /> Rush order</span>
                <span className="mt-0.5 block text-sm text-muted">Priority printing, +{rushPct}%</span>
              </span>
              <span className={cn('relative h-6 w-11 rounded-full transition', rush ? 'bg-brand' : 'bg-line')}>
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', rush ? 'left-[22px]' : 'left-0.5')} />
              </span>
            </button>
            <p className="text-xs leading-relaxed text-muted">
              Eyelets, layout and other add-ons are quoted at the counter. Final price is confirmed when we review your file.
            </p>
          </div>

          <div className="relative flex flex-col justify-between gap-8 bg-gradient-to-br from-primary-50 via-white to-accent-100/40 p-6 dark:from-primary/10 dark:via-surface dark:to-accent/5 sm:p-10">
            <svg viewBox="0 0 100 64" className="w-full" role="img" aria-label={`Preview of a ${w} by ${h} foot tarp`}>
              <motion.rect
                initial={false}
                animate={{ attrX: x, attrY: y, width: dw, height: dh }}
                transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                x={x} y={y} width={dw} height={dh}
                rx="1.5"
                fill="url(#tarpFill)"
                stroke="rgb(99 102 241 / 0.5)"
                strokeWidth="0.3"
              />
              {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy], i) => {
                const px = x + 1.8 + cx * (dw - 3.6)
                const py = y + 1.8 + cy * (dh - 3.6)
                return (
                  <motion.circle key={i} r="0.9" fill="white" stroke="rgb(99 102 241)" strokeWidth="0.35"
                    cx={px} cy={py} initial={false} animate={{ cx: px, cy: py }}
                    transition={{ type: 'spring', stiffness: 160, damping: 20 }} />
                )
              })}
              <text x={50} y={y + dh / 2 + 1.4} textAnchor="middle" fill="white" className="font-display" style={{ fontSize: Math.min(4, dw / 6), fontWeight: 800, transition: 'all .3s' }}>
                {w} × {h} ft
              </text>
              <defs>
                <linearGradient id="tarpFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6366F1" />
                  <stop offset="0.6" stopColor="#8B5CF6" />
                  <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">
                  {area.toLocaleString('en-PH')} sq ft{qty > 1 ? ` × ${qty}` : ''}{minApplied ? ' · minimum charge applied' : ''}
                </p>
                <p className="mt-1 font-display text-[clamp(2.6rem,6vw,4rem)] font-extrabold leading-none tracking-tight">
                  <AnimatedNumber value={total} format={(v) => peso(v)} />
                </p>
                <p className="mt-2 text-xs text-muted">{serverTotal === null ? 'Estimate' : 'Live price from our shop system'}</p>
              </div>
              <a
                href="#contact"
                onClick={() => window.dispatchEvent(new CustomEvent('jfm-prefill', {
                  detail: { service: 'Tarpaulin Printing', message: `Hi! I'd like ${qty} tarp${qty > 1 ? 's' : ''} at ${w} × ${h} ft${rush ? ' (rush)' : ''}. Estimate shown: ${peso(total)}.` },
                }))}
                className="inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-primary-700 dark:bg-white dark:text-slate-900">
                Send this as a quote request
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
