import { motion, useReducedMotion } from 'framer-motion'
import { Clock, MessageCircle, Sparkles } from 'lucide-react'
import { BubbleBackground } from './BubbleBackground'
import { DashboardMockup } from './DashboardMockup'
import { Magnetic } from './motion'

/**
 * The page's one orchestrated moment: the headline assembles word by word and every full stop
 * lands as a gradient bubble — the brand mark living inside the type.
 */
function Headline({ text }) {
  const reduce = useReducedMotion()
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <h1 className="font-display text-[clamp(3rem,9vw,6.4rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-ink">
      <span className="sr-only">{text}</span>
      <span aria-hidden className="flex flex-wrap gap-x-[0.28em]">
        {words.map((w, i) => {
          const ends = /[.!]$/.test(w)
          const core = ends ? w.slice(0, -1) : w
          return (
            <span key={i} className="inline-flex overflow-hidden pb-[0.08em]">
              <motion.span
                className="inline-flex items-end"
                initial={reduce ? false : { y: '105%', rotate: 4 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ delay: 0.15 + i * 0.16, type: 'spring', stiffness: 180, damping: 20 }}
              >
                {core}
                {ends && (
                  <motion.span
                    className="mb-[0.14em] ml-[0.04em] inline-block h-[0.2em] w-[0.2em] rounded-full bg-brand shadow-[0_4px_14px_-2px_rgb(99_102_241/0.6)]"
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.45 + i * 0.16, type: 'spring', stiffness: 520, damping: 14 }}
                  />
                )}
              </motion.span>
            </span>
          )
        })}
      </span>
    </h1>
  )
}

export function Hero({ hero, business }) {
  return (
    <section id="top" className="relative overflow-hidden pb-20 pt-32 sm:pt-40 lg:pb-28">
      <BubbleBackground />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3.5 py-1.5 text-sm font-medium text-muted shadow-soft backdrop-blur dark:border-line dark:bg-surface/60"
          >
            <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-success/60" /><span className="relative h-2 w-2 rounded-full bg-success" /></span>
            Open today. Same-day tarps if ordered by 2 PM
          </motion.p>

          <Headline text={hero.headline || 'Print. Stock. Grow.'} />

          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
            className="mt-7 max-w-[34rem] text-lg leading-relaxed text-muted"
          >
            {hero.subtext}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>
              <a href="#services" className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-base font-semibold text-white shadow-[0_12px_30px_-10px_rgb(99_102_241/0.8)] transition hover:brightness-110">
                <Sparkles className="h-4 w-4" /> {hero.primaryCta || 'View Services'}
              </a>
            </Magnetic>
            <Magnetic strength={0.2}>
              <a href="#pricing" className="inline-flex h-12 items-center rounded-full border border-line bg-white/70 px-7 text-base font-semibold text-ink backdrop-blur transition hover:bg-white dark:bg-surface/70">
                {hero.secondaryCta || 'Get a Quote'}
              </a>
            </Magnetic>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-accent" /> Mon–Sat 8 AM – 7 PM</span>
            {business?.facebookUrl && (
              <a href={business.facebookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
                <MessageCircle className="h-4 w-4 text-primary" /> Message us on Facebook
              </a>
            )}
          </motion.div>
        </div>

        <DashboardMockup />
      </div>
    </section>
  )
}
