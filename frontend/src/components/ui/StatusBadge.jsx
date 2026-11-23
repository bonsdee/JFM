import { Badge } from './Display'
import { JOB_STATUS, PO_STATUS, STOCK_STATUS } from '@/lib/constants'
import { humanize } from '@/lib/format'

const maps = {
  job: JOB_STATUS,
  po: PO_STATUS,
  stock: STOCK_STATUS,
  sale: { COMPLETED: { label: 'Completed', tone: 'success' }, VOIDED: { label: 'Voided', tone: 'danger' } },
  inquiry: {
    NEW: { label: 'New', tone: 'primary' },
    READ: { label: 'Read', tone: 'neutral' },
    REPLIED: { label: 'Replied', tone: 'success' },
    ARCHIVED: { label: 'Archived', tone: 'neutral' },
  },
}

/** Maps a domain status to a consistently colored pill. */
export function StatusBadge({ kind, status }) {
  const meta = maps[kind]?.[status] || { label: humanize(status), tone: 'neutral' }
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
