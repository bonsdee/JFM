import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { cn } from '@/lib/cn'

/** Scroll-triggered reveal; children with `variants={revealItem}` stagger in. */
export function Reveal({ children, className, as = 'div', stagger = 0.07, delay = 0, ...props }) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...props}
    >
      {children}
    </Comp>
  )
}

export const revealItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}

/** Number that counts up once it scrolls into view. */
export function CountUp({ value, suffix = '', duration = 1.6, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (!inView || reduce) { setDisplay(value); return }
    const controls = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setDisplay(Math.round(v)) })
    return () => controls.stop()
  }, [inView, value, duration, reduce])

  return <span ref={ref} className={cn('tabular', className)}>{display.toLocaleString('en-PH')}{suffix}</span>
}

/** Smoothly animates between numeric values (price estimator). */
export function AnimatedNumber({ value, format = (v) => v.toFixed(2), className }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (reduce) { setDisplay(value); prev.current = value; return }
    const controls = animate(prev.current, value, { duration: 0.45, ease: 'easeOut', onUpdate: setDisplay })
    prev.current = value
    return () => controls.stop()
  }, [value, reduce])
  return <span className={cn('tabular', className)}>{format(display)}</span>
}

/** Primary CTA that leans toward the cursor (desktop pointer only). */
export function Magnetic({ children, strength = 0.28, className }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 250, damping: 18 })
  const sy = useSpring(y, { stiffness: 250, damping: 18 })
  const reduce = useReducedMotion()

  const onMove = (e) => {
    if (reduce || e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => { x.set(0); y.set(0) }

  return (
    <motion.span ref={ref} style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={reset} className={cn('inline-block', className)}>
      {children}
    </motion.span>
  )
}
