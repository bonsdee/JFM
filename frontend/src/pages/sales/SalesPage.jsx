import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Receipt, ShoppingCart } from 'lucide-react'
import { Badge, Button, DataTable, DateRangePicker, EmptyState, PageHeader, SearchInput, Select, StatusBadge } from '@/components/ui'
import { useSales } from '@/features/sales'
import { PAYMENT_LABEL } from '@/lib/constants'
import { dayStartInstant, fmtDateTime, isoDaysAgo, peso, todayISO } from '@/lib/format'

export default function SalesPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [range, setRange] = useState({ from: isoDaysAgo(6), to: todayISO() })
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('soldAt,desc')
  const { data, isLoading } = useSales({ q, status, source, page, sort, from: dayStartInstant(range.from), to: dayStartInstant(range.to, true) })

  const pageTotal = data?.content.filter((s) => s.status === 'COMPLETED').reduce((sum, s) => sum + Number(s.total), 0) || 0

  return (
    <>
      <PageHeader title="Sales history" subtitle="View, reprint or void receipts. Voiding restores stock." actions={<Link to="/app/pos"><Button icon={ShoppingCart}>New sale</Button></Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Receipt # or customer" className="w-56" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} placeholder="Any status" className="w-40"><option value="COMPLETED">Completed</option><option value="VOIDED">Voided</option></Select>
        <Select value={source} onChange={(e) => { setSource(e.target.value); setPage(0) }} placeholder="POS & jobs" className="w-40"><option value="POS">POS only</option><option value="JOB_ORDER">Job orders</option></Select>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPage(0) }} />
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.content}
        page={data}
        onPageChange={setPage}
        sort={sort}
        onSort={setSort}
        onRowClick={(s) => navigate(`/app/sales/${s.id}`)}
        columns={[
          { key: 'saleNumber', header: 'Receipt #', sortable: true, cell: (s) => <span className="font-semibold">{s.saleNumber}</span> },
          { key: 'soldAt', header: 'Date', sortable: true, cell: (s) => <span className="tabular whitespace-nowrap text-muted">{fmtDateTime(s.soldAt)}</span> },
          { key: 'customerName', header: 'Customer' },
          { key: 'source', header: 'Source', cell: (s) => <Badge tone={s.source === 'JOB_ORDER' ? 'violet' : 'neutral'} dot={false}>{s.source === 'JOB_ORDER' ? 'Job order' : 'POS'}</Badge> },
          { key: 'paymentMethods', header: 'Paid via', cell: (s) => s.paymentMethods?.split(', ').map((m) => PAYMENT_LABEL[m] || m).join(', ') || '—' },
          { key: 'status', header: 'Status', cell: (s) => <StatusBadge kind="sale" status={s.status} /> },
          { key: 'grossProfit', header: 'Profit', align: 'right', cell: (s) => <span className="text-muted">{peso(s.grossProfit)}</span> },
          { key: 'total', header: 'Total', sortable: true, align: 'right', cell: (s) => <span className={s.status === 'VOIDED' ? 'text-muted line-through' : 'font-semibold'}>{peso(s.total)}</span> },
        ]}
        footer={<tr><td colSpan={7} className="px-4 py-3 text-right text-sm">Completed on this page</td><td className="tabular px-4 py-3 text-right">{peso(pageTotal)}</td></tr>}
        empty={<EmptyState icon={Receipt} title="No sales in this period" action={<Link to="/app/pos"><Button icon={ShoppingCart}>Open POS</Button></Link>} />}
      />
    </>
  )
}
