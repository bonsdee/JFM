import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { CheckCircle2, Image, Printer } from 'lucide-react'

const BARS = [38, 52, 45, 66, 58, 80, 72]
const JOBS = [
  { id: 'JO-00121', name: 'Barangay fiesta tarp', size: '4×8 ft', status: 'Printing', tone: 'bg-primary-50 text-primary-700' },
  { id: 'JO-00122', name: 'Café logo stickers', size: '200 pcs', status: 'For approval', tone: 'bg-warning-50 text-warning-700' },
  { id: 'JO-00123', name: 'Debut invitations', size: '120 pcs', status: 'Ready', tone: 'bg-accent-100 text-accent-600' },
]

/** Floating "3D-ish" glimpse of the owner dashboard; tilts toward the pointer. Illustrative only. */
export function DashboardMockup() {
  const reduce = useReducedMotion()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [9, -9]), { stiffness: 140, damping: 16 })
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-11, 11]), { stiffness: 140, damping: 16 })

  const onMove = (e) => {
    if (reduce) return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  const reset = () => { px.set(0); py.set(0) }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 90, damping: 16 }}
      className="relative mx-auto w-full max-w-[480px] [perspective:1200px]"
      onPointerMove={onMove}
      onPointerLeave={reset}
      aria-hidden
    >
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }} className="relative">
        <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_40px_80px_-30px_rgb(79_70_229/0.45)] backdrop-blur-xl dark:border-line dark:bg-surface/80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Today's sales</p>
              <p className="tabular font-display text-3xl font-extrabold">₱8,420.50</p>
            </div>
            <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-bold text-success-700">+18.2%</span>
          </div>
          <div className="flex h-28 items-end gap-2">
            {BARS.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-xl bg-gradient-to-t from-primary-500 to-violet-500"
                style={{ opacity: i === BARS.length - 1 ? 1 : 0.35 + i * 0.08 }}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.9 + i * 0.06, type: 'spring', stiffness: 120, damping: 16 }}
              />
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {JOBS.map((j) => (
              <div key={j.id} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-subtle"><Printer className="h-4 w-4 text-muted" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{j.name}</p>
                  <p className="text-xs text-muted">{j.id} · {j.size}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${j.tone}`}>{j.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating chips at different depths */}
        <motion.div style={{ translateZ: 60 }} animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-10 top-[27%] hidden rounded-2xl border border-white/70 bg-white/90 px-3.5 py-2.5 shadow-lift backdrop-blur sm:block dark:border-line dark:bg-surface/90">
          <p className="flex items-center gap-2 text-sm font-semibold"><Image className="h-4 w-4 text-accent" /> 3×5 ft tarp</p>
          <p className="tabular text-xs text-muted">₱225.00 · ready by 4 PM</p>
        </motion.div>
        <motion.div style={{ translateZ: 80 }} animate={reduce ? undefined : { y: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-5 -right-4 hidden items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold shadow-lift backdrop-blur sm:flex dark:border-line dark:bg-surface/90">
          <CheckCircle2 className="h-4 w-4 text-success" /> Stock auto-updated
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
