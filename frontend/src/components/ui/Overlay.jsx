import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/cn'

/** Locks body scroll, closes on Escape and restores focus to the opener. */
function useDialogBehavior(open, onClose, panelRef) {
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        const list = [...nodes].filter((n) => !n.disabled)
        if (!list.length) return
        const first = list[0], last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault() }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault() }
      }
    }
    window.addEventListener('keydown', onKey)
    setTimeout(() => panelRef.current?.querySelector('[data-autofocus], input, select, textarea, button')?.focus(), 30)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [open, onClose, panelRef])
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  useDialogBehavior(open, onClose, ref)
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={cn('relative flex max-h-[92vh] w-full flex-col rounded-t-card bg-surface shadow-lift sm:rounded-card', sizes[size])}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
            </div>
            <div className="scrollbar-thin overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line/70 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, description, children, footer, width = 'max-w-xl' }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  useDialogBehavior(open, onClose, ref)
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={cn('absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-lift sm:rounded-l-card', width)}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line/70 px-6 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Confirmation for destructive or irreversible actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'danger', loading, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Keep it</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger dark:bg-danger/15">
            <AlertTriangle className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 text-sm text-muted">
          {message}
          {children}
        </div>
      </div>
    </Modal>
  )
}
