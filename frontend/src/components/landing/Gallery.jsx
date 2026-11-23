import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { SectionHeading } from './Sections'
import { Reveal, revealItem } from './motion'

/**
 * Placeholder sample works (pure CSS art) shown until the owner uploads real photos in
 * Settings → Website → Gallery. Aspect ratios vary to show off the masonry layout.
 */
const PLACEHOLDERS = [
  { title: 'Birthday tarpaulin', caption: '3 × 5 ft, eco-solvent', ratio: 'aspect-[4/5]', art: 'from-primary-500 via-violet-500 to-accent' },
  { title: 'Café logo stickers', caption: 'Kiss-cut, glossy', ratio: 'aspect-square', art: 'from-amber-300 via-orange-400 to-rose-400' },
  { title: 'Business cards', caption: '220gsm matte', ratio: 'aspect-[4/3]', art: 'from-slate-700 via-slate-800 to-indigo-900' },
  { title: 'Debut invitations', caption: 'With envelopes', ratio: 'aspect-[3/4]', art: 'from-pink-200 via-violet-200 to-indigo-200' },
  { title: 'Store signage', caption: '4 × 8 ft with eyelets', ratio: 'aspect-[16/10]', art: 'from-emerald-400 via-teal-500 to-cyan-600' },
  { title: 'Team shirts', caption: 'Heat-transfer vinyl', ratio: 'aspect-[4/5]', art: 'from-sky-400 via-blue-500 to-indigo-600' },
]

function Tile({ item, onOpen }) {
  return (
    <motion.button
      type="button"
      variants={revealItem}
      onClick={onOpen}
      className="group relative mb-4 block w-full overflow-hidden rounded-[24px] text-left focus-visible:ring-4 focus-visible:ring-primary/30"
      aria-label={`Open ${item.title}`}
    >
      {item.url ? (
        <img src={item.url} alt={item.title || 'Sample work'} loading="lazy" decoding="async" className="w-full transition duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div className={`${item.ratio} w-full bg-gradient-to-br ${item.art} transition duration-500 group-hover:scale-[1.03]`}>
          <span className="absolute left-[12%] top-[14%] h-1/3 w-1/3 rounded-full bg-white/25 blur-md" />
          <span className="absolute bottom-[16%] right-[14%] h-1/5 w-1/5 rounded-full bg-white/30" />
        </div>
      )}
      <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded-2xl bg-white/85 px-4 py-2.5 opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-slate-900/80">
        <span className="block text-sm font-semibold text-ink">{item.title}</span>
        {item.caption && <span className="block text-xs text-muted">{item.caption}</span>}
      </span>
    </motion.button>
  )
}

export function Gallery({ items, heading = {} }) {
  const list = items?.length ? items : PLACEHOLDERS
  const [index, setIndex] = useState(-1)
  const open = index >= 0
  const current = list[index]

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setIndex(-1)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % list.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + list.length) % list.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, list.length])

  return (
    <section id="gallery" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading title={heading.title} subtitle={items?.length ? heading.subtitle : 'Sample layouts — real photos of our work are coming soon.'} />
        <Reveal className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3" stagger={0.06}>
          {list.map((item, i) => <Tile key={i} item={item} onOpen={() => setIndex(i)} />)}
        </Reveal>
      </div>

      <AnimatePresence>
        {open && current && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-label={current.title} onClick={() => setIndex(-1)}>
            <motion.figure key={index} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              {current.url ? (
                <img src={current.url} alt={current.title} className="max-h-[78vh] w-full rounded-[24px] object-contain" />
              ) : (
                <div className={`aspect-[4/3] w-full rounded-[24px] bg-gradient-to-br ${current.art}`} />
              )}
              <figcaption className="mt-4 text-center text-white">
                <span className="font-semibold">{current.title}</span>
                {current.caption && <span className="block text-sm text-white/70">{current.caption}</span>}
              </figcaption>
            </motion.figure>
            <button type="button" className="absolute right-5 top-5 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" onClick={() => setIndex(-1)} aria-label="Close"><X className="h-5 w-5" /></button>
            <button type="button" className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + list.length) % list.length) }} aria-label="Previous"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % list.length) }} aria-label="Next"><ChevronRight className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
