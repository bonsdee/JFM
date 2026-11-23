import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, Lightbulb, Plus } from 'lucide-react'
import { Button, DataTable, DateRangePicker, EmptyState, PageHeader, SearchInput, Select, StatCard, StatusBadge, Toggle } from '@/components/ui'
import { useAllSuppliers, usePoSummary, usePurchaseOrders } from '@/features/purchasing'
import { PO_STATUS } from '@/lib/constants'
import { fmtDate, isoDaysAgo, peso, todayISO } from '@/lib/format'

/** Purchase / restock history with filters, totals spent and supplier payables. */
export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [supplierId, setSupplier] = useState('')
  const [unpaid, setUnpaid] = useState(false)
  const [range, setRange] = useState({ from: isoDaysAgo(89), to: todayISO() })
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('createdAt,desc')
  const filters = { status: status ? [status] : undefined, supplierId, from: range.from, to: range.to }
  const { data, isLoading } = usePurchaseOrders({ ...filters, q, unpaid, page, sort })
  const { data: summary } = usePoSummary(filters)
  const { data: suppliers } = useAllSuppliers()

  return (
    <>
      <PageHeader
        title="Purchase orders"
        subtitle="Restock history, receiving and what you still owe suppliers."
        actions={
          <>
            <Link to="/app/purchasing/reorder"><Button variant="secondary" icon={Lightbulb}>Reorder suggestions</Button></Link>
            <Link to="/app/purchasing/orders/new"><Button icon={Plus}>New purchase order</Button></Link>
          </>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders in period" value={summary?.orders ?? '—'} loading={!summary} />
        <StatCard label="Total ordered" value={peso(summary?.totalOrdered)} loading={!summary} tone="violet" />
        <StatCard label="Received value" value={peso(summary?.totalReceived)} loading={!summary} tone="success" />
        <StatCard label="Unpaid balance" value={peso(summary?.totalPayables)} hint={`${peso(summary?.totalPaid)} paid so far`} loading={!summary} tone="warning" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="PO number or supplier" className="w-56" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} placeholder="All statuses" className="w-48">
          {Object.entries(PO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={supplierId} onChange={(e) => { setSupplier(e.target.value); setPage(0) }} placeholder="All suppliers" className="w-52">
          {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPage(0) }} />
        <Toggle checked={unpaid} onChange={(v) => { setUnpaid(v); setPage(0) }} label="Unpaid only" />
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.content}
        page={data}
        onPageChange={setPage}
        sort={sort}
        onSort={setSort}
        onRowClick={(po) => navigate(`/app/purchasing/orders/${po.id}`)}
        columns={[
          { key: 'poNumber', header: 'PO #', sortable: true, cell: (po) => <span className="font-semibold">{po.poNumber}</span> },
          { key: 'supplierName', header: 'Supplier' },
          { key: 'status', header: 'Status', cell: (po) => <StatusBadge kind="po" status={po.status} /> },
          { key: 'orderDate', header: 'Order date', sortable: true, cell: (po) => fmtDate(po.orderDate) },
          { key: 'itemCount', header: 'Items', align: 'right' },
          { key: 'totalAmount', header: 'Total', sortable: true, align: 'right', cell: (po) => peso(po.totalAmount) },
          { key: 'amountPaid', header: 'Paid', align: 'right', cell: (po) => peso(po.amountPaid) },
          { key: 'balance', header: 'Balance', align: 'right', cell: (po) => <span className={po.balance > 0 && po.status !== 'DRAFT' ? 'font-semibold text-warning-700 dark:text-amber-300' : 'text-muted'}>{peso(po.balance)}</span> },
        ]}
        empty={<EmptyState icon={ClipboardList} title="No purchase orders" message="Create one manually or from reorder suggestions." action={<Link to="/app/purchasing/orders/new"><Button icon={Plus}>New purchase order</Button></Link>} />}
      />
    </>
  )
}
