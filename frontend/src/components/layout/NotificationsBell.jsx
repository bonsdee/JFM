import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCheck, Clock, Inbox, PackageX, Wallet } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { useMarkNotification, useNotifications } from '@/features/admin'
import { relative } from '@/lib/format'
import { cn } from '@/lib/cn'

const ICONS = {
  LOW_STOCK: AlertTriangle, OUT_OF_STOCK: PackageX, OVERDUE_JOB: Clock, JOB_DUE_SOON: Clock, UNPAID_PO: Wallet, NEW_INQUIRY: Inbox,
}
const TONE = {
  DANGER: 'bg-danger-50 text-danger dark:bg-danger/15',
  WARNING: 'bg-warning-50 text-warning-700 dark:bg-warning/15 dark:text-amber-300',
  INFO: 'bg-primary-50 text-primary dark:bg-primary/15',
}

export function NotificationsBell() {
  const { data } = useNotifications()
  const mark = useMarkNotification()
  const navigate = useNavigate()
  const unread = data?.unread || 0

  return (
    <Dropdown
      className="w-[min(92vw,380px)] p-0"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="relative rounded-full p-2.5 text-muted hover:bg-subtle hover:text-ink" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="tabular absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-bold">Notifications</p>
        {unread > 0 && (
          <button type="button" onClick={() => mark.mutate(null)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      <div className="scrollbar-thin max-h-[420px] overflow-y-auto p-1.5">
        {!data?.items?.length && <p className="px-4 py-10 text-center text-sm text-muted">You're all caught up.</p>}
        {data?.items?.map((n) => {
          const Icon = ICONS[n.type] || Bell
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => { if (!n.read) mark.mutate(n.id); if (n.link) navigate(n.link) }}
              className={cn('flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-subtle', !n.read && 'bg-primary-50/40 dark:bg-primary/5')}
            >
              <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TONE[n.severity])}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className={cn('text-sm', n.read ? 'text-muted' : 'font-semibold text-ink')}>{n.title}</span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">{n.message}</span>
                <span className="mt-0.5 block text-[11px] text-muted/80">{relative(n.createdAt)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Dropdown>
  )
}
