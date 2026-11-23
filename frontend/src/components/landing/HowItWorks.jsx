import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { CheckCircle2, FileUp, Printer, Store } from 'lucide-react'
import { SectionHeading } from './Sections'
import { Reveal, revealItem } from './motion'

const ICONS = [FileUp, CheckCircle2, Printer, Store]

/** Four sequential steps joined by an SVG path that draws itself as you scroll. */
export function HowItWorks({ steps = [], heading = {} }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 })

  return (
    <section id="how" ref={ref} className="relative scroll-mt-24 overflow-hidden bg-surface py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading title={heading.title} subtitle={heading.subtitle} align="center" />
        <div className="relative mt-16">
          <svg className="absolute left-0 top-7 hidden h-24 w-full md:block" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
            <path d="M60 50 C 220 -10, 300 110, 375 50 S 540 -10, 625 50 S 800 110, 940 50" fill="none" stroke="rgb(var(--line))" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
            <motion.path
              d="M60 50 C 220 -10, 300 110, 375 50 S 540 -10, 625 50 S 800 110, 940 50"
              fill="none" stroke="url(#howGrad)" strokeWidth="4" strokeLinecap="round"
              style={{ pathLength: progress }}
            />
            <defs>
              <linearGradient id="howGrad" x1="0" x2="1"><stop offset="0" stopColor="#6366F1" /><stop offset="1" stopColor="#06B6D4" /></linearGradient>
            </defs>
          </svg>
          <Reveal as="ol" className="relative grid gap-10 md:grid-cols-4 md:gap-6" stagger={0.12}>
            {steps.map((s, i) => {
              const Icon = ICONS[i % ICONS.length]
              return (
                <motion.li key={i} variants={revealItem} className="text-center">
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_28px_-10px_rgb(99_102_241/0.8)] ring-8 ring-surface">
                    <Icon className="h-6 w-6" aria-hidden />
                    <span className="tabular absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white ring-4 ring-surface">{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">{s.description}</p>
                </motion.li>
              )
            })}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
