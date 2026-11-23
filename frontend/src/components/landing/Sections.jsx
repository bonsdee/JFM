import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { CountUp, Reveal, revealItem } from './motion'
import { iconFor } from './serviceIcons'
import { peso } from '@/lib/format'

export function SectionHeading({ title, subtitle, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <h2 className="font-display text-[clamp(2rem,4.2vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">{title}</h2>
      {subtitle && <p className="mt-4 text-lg leading-relaxed text-muted">{subtitle}</p>}
    </div>
  )
}

/** Count-up stats; values editable in Settings → Website. */
export function TrustStrip({ stats = [] }) {
  return (
    <section aria-label="Shop highlights" className="relative border-y border-line/60 bg-surface/60 backdrop-blur">
      <Reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-5 py-10 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={i} variants={revealItem} className="px-2 text-center md:border-l md:border-line/70 md:first:border-l-0">
            <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {s.display ? s.display : <CountUp value={Number(s.value) || 0} suffix={s.suffix || ''} />}
            </p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </motion.div>
        ))}
      </Reveal>
    </section>
  )
}

export function ServicesGrid({ services = [] }) {
  return (
    <section id="services" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading title="Everything you need printed, under one roof" subtitle="Walk in with a file, walk out with a finished piece — or send it ahead and we'll have it ready." />
        <Reveal className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
          {services.map((s) => {
            const Icon = iconFor(s.icon)
            return (
              <motion.article
                key={s.slug}
                variants={revealItem}
                whileHover="hover"
                className="group relative overflow-hidden rounded-[28px] border border-line/70 bg-surface p-6 transition-shadow hover:shadow-lift"
              >
                <motion.span
                  variants={{ hover: { scale: 1.35, opacity: 0.16 } }}
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand opacity-[0.07]"
                  aria-hidden
                />
                <motion.span
                  variants={{ hover: { y: [0, -6, 0], transition: { duration: 0.5 } } }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary ring-8 ring-primary-50/50 dark:bg-primary/15 dark:ring-primary/5"
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </motion.span>
                <h3 className="mt-5 text-lg font-bold">{s.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.description}</p>
                <p className="mt-5 text-sm">
                  <span className="text-muted">from </span>
                  <span className="tabular font-bold text-ink">{peso(s.startingPrice)}</span>
                  <span className="text-muted"> {s.unitLabel}</span>
                </p>
              </motion.article>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}

export function Marquee({ items = [] }) {
  const doubled = [...items, ...items]
  return (
    <section aria-label="What we print" className="overflow-hidden border-y border-line/60 bg-surface py-6">
      <div className="flex w-max animate-marquee gap-4 motion-reduce:animate-none">
        {doubled.map((t, i) => (
          <span key={i} className="flex items-center gap-4 whitespace-nowrap font-display text-2xl font-bold text-muted/60">
            {t}
            <span className="h-2.5 w-2.5 rounded-full bg-brand opacity-70" aria-hidden />
          </span>
        ))}
      </div>
    </section>
  )
}

export function Faq({ items = [] }) {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="scroll-mt-24 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading title="Questions we hear at the counter" subtitle="Still unsure? Send us a message below — we usually reply within the hour during shop hours." />
        <div className="space-y-3">
          {items.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={i} className={`rounded-[22px] border transition ${isOpen ? 'border-primary-200 bg-surface shadow-soft dark:border-primary/30' : 'border-line/70 bg-surface/60'}`}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold"
                  >
                    {f.q}
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOpen ? 'bg-brand text-white' : 'bg-subtle text-muted'}`}>
                      <Plus className="h-4 w-4" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-[15px] leading-relaxed text-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
