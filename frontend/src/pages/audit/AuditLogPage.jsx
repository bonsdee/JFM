import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Badge, DataTable, DateRangePicker, EmptyState, PageHeader, SearchInput, Select } from '@/components/ui'
import { useAuditLogs } from '@/features/admin'
import { dayStartInstant, fmtDateTime, humanize, isoDaysAgo, todayISO } from '@/lib/format'

const ACTION_TONE = { CREATE: 'success', UPDATE: 'primary', DELETE: 'danger', ARCHIVE: 'warning', RESTORE: 'accent', VOID: 'danger', STATUS_CHANGE: 'violet', RECEIVE: 'success', PAYMENT: 'accent', STOCK_POST: 'primary', IMPORT: 'neutral', EXPORT: 'neutral' }
const ENTITIES = ['PRODUCT', 'CATEGORY', 'SUPPLIER', 'CUSTOMER', 'STOCK', 'PURCHASE_ORDER', 'SERVICE', 'JOB_ORDER', 'SALE', 'EXPENSE', 'EXPENSE_CATEGORY', 'INQUIRY', 'SETTINGS', 'SITE_CONTENT', 'BACKUP']

/** Who / what / when for every create, update, delete and void. */
export default function AuditLogPage() {
  const [q, setQ] = useState('')
  const [entityType, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [range, setRange] = useState({ from: isoDaysAgo(29), to: todayISO() })
  const [page, setPage] = useState(0)
  const { data, isLoading } = useAuditLogs({ q, entityType, action, page, from: dayStartInstant(range.from), to: dayStartInstant(range.to, true) })

  return (
    <>
      <PageHeader title="Audit log" subtitle="A permanent record of every change made in PrintHub." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Search summaries" className="w-56" />
        <Select value={entityType} onChange={(e) => { setEntity(e.target.value); setPage(0) }} placeholder="All records" className="w-48">{ENTITIES.map((e) => <option key={e} value={e}>{humanize(e)}</option>)}</Select>
        <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(0) }} placeholder="All actions" className="w-44">{Object.keys(ACTION_TONE).map((a) => <option key={a} value={a}>{humanize(a)}</option>)}</Select>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPage(0) }} />
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.content}
        page={data}
        onPageChange={setPage}
        dense
        columns={[
          { key: 'createdAt', header: 'When', cell: (a) => <span className="tabular whitespace-nowrap text-muted">{fmtDateTime(a.createdAt)}</span> },
          { key: 'action', header: 'Action', cell: (a) => <Badge tone={ACTION_TONE[a.action] || 'neutral'}>{humanize(a.action)}</Badge> },
          { key: 'entityType', header: 'Record', cell: (a) => humanize(a.entityType) },
          { key: 'summary', header: 'Summary', cell: (a) => <span className="font-medium">{a.summary}</span> },
          { key: 'actorEmail', header: 'By', cell: (a) => <span className="text-muted">{a.actorEmail || 'system'}</span> },
        ]}
        empty={<EmptyState icon={ShieldCheck} title="No activity in this period" />}
      />
    </>
  )
}
