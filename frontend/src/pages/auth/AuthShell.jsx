import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { BubbleBackground } from '@/components/landing/BubbleBackground'

/** Shared frame for login / forgot / reset — continues the landing page's bubble world. */
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-12">
      <BubbleBackground />
      <Link to="/" className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3.5 py-2 text-sm font-medium text-muted backdrop-blur hover:text-ink dark:bg-surface/60">
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative w-full max-w-md rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-lift backdrop-blur-xl dark:border-line dark:bg-surface/85 sm:p-10"
      >
        <Logo />
        <h1 className="mt-8 text-[1.75rem] font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </motion.div>
    </div>
  )
}
