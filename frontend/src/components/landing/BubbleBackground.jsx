import { useEffect } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'

/**
 * Soft gradient bubbles that drift (CSS keyframes, transform-only) and shift subtly with the mouse.
 * Each layer moves at a different depth for parallax. Pure decoration: aria-hidden, pointer-events none.
 */
const BUBBLES = [
  { size: 420, top: '-8%', left: '-6%', from: '#818CF8', to: '#C4B5FD', depth: 18, dur: 22 },
  { size: 300, top: '12%', left: '62%', from: '#67E8F9', to: '#A5B4FC', depth: 30, dur: 26 },
  { size: 180, top: '58%', left: '8%', from: '#C4B5FD', to: '#F5D0FE', depth: 42, dur: 18 },
  { size: 240, top: '64%', left: '74%', from: '#A5B4FC', to: '#67E8F9', depth: 24, dur: 24 },
  { size: 90, top: '30%', left: '44%', from: '#22D3EE', to: '#818CF8', depth: 60, dur: 16 },
  { size: 60, top: '78%', left: '48%', from: '#8B5CF6', to: '#6366F1', depth: 70, dur: 14 },
]

export function BubbleBackground() {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 40, damping: 18 })
  const sy = useSpring(my, { stiffness: 40, damping: 18 })

  useEffect(() => {
    if (reduce) return
    const onMove = (e) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my, reduce])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{`
        @keyframes jfm-drift { 0%,100% { transform: translate3d(0,0,0) scale(1) } 33% { transform: translate3d(24px,-30px,0) scale(1.04) } 66% { transform: translate3d(-18px,16px,0) scale(.97) } }
      `}</style>
      {BUBBLES.map((b, i) => (
        <Bubble key={i} b={b} sx={sx} sy={sy} />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgb(var(--bg))_75%)]" />
    </div>
  )
}

function Bubble({ b, sx, sy }) {
  const x = useTransform(sx, (v) => v * b.depth)
  const y = useTransform(sy, (v) => v * b.depth)
  return (
    <motion.div className="absolute will-change-transform" style={{ top: b.top, left: b.left, x, y }}>
      <div
        className="rounded-full opacity-60 blur-2xl dark:opacity-30"
        style={{
          width: b.size,
          height: b.size,
          background: `radial-gradient(circle at 30% 30%, ${b.from}, ${b.to} 70%)`,
          animation: `jfm-drift ${b.dur}s ease-in-out infinite`,
        }}
      />
    </motion.div>
  )
}

/** Soft blob that trails the cursor on desktop. */
export function CursorBlob() {
  const reduce = useReducedMotion()
  const x = useMotionValue(-400)
  const y = useMotionValue(-400)
  const sx = useSpring(x, { stiffness: 120, damping: 20 })
  const sy = useSpring(y, { stiffness: 120, damping: 20 })

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (e) => { x.set(e.clientX - 160); y.set(e.clientY - 160) }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [x, y, reduce])

  if (reduce) return null
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 hidden h-80 w-80 rounded-full bg-[radial-gradient(circle,rgb(99_102_241/0.14),transparent_65%)] lg:block"
      style={{ x: sx, y: sy }}
    />
  )
}
