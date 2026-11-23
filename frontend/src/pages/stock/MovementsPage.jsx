import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, CheckCircle2, Minus, Plus, Repeat, ShieldAlert } from 'lucide-react'
import { Badge, Button, DataTable, DateRangePicker, EmptyState, PageHeader, SearchInput, Select } from '@/components/ui'
import { useReconciliation, useStockMovements } from '@/features/stock'
import { MOVEMENT_REASONS, UNIT_LABEL } from '@/lib/constants'
import { dayStartInstant, fmtDateTime, isoDaysAgo, num, peso, todayISO } from '@/lib/format'
import { cn } from '@/lib/cn'

const TYPE_TONE = { IN: 'success', OUT: 'danger', ADJUST: 'warning' }

/** Global inventory ledger with filters. Every stock change in the system appears here. */
export default function MovementsPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [reason, setReason] = useState('')
  const [range, setRange] = useState({ from: isoDaysAgo(29), to: todayISO() })
  const [page, setPage] = useState(0)
  const { data, isLoading } = useStockMovements({ q, type, reason, page, size: 25, from: dayStartInstant(range.from), to: dayStartInstant(range.to, true) })
  const { data: drift } = useReconciliation()

  return (
    <>
      <PageHeader
        title="Stock ledger"
        subtitle="The single source of truth: every quantity change with its reason and reference."
        actions={
          <>
            <Link to="/app/stock/count"><Button variant="secondary" icon={Repeat}>Physical count</Button></Link>
            <Link to="/app/stock/out"><Button variant="secondary" icon={Minus}>Stock out</Button></Link>
            <Link to="/app/stock/in"><Button icon={Plus}>Stock in</Button></Link>
          </>
        }
      />

      {drift && (
        <div className={cn('mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm', drift.length ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700 dark:bg-success/10 dark:text-emerald-300')}>
          {drift.length ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {drift.length ? `${drift.length} product(s) differ from the ledger — run a physical count.` : 'All product balances match the ledger.'}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Product, SKU or reference" className="w-64" />
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(0) }} placeholder="All types" className="w-36">
          <option value="IN">In</option><option value="OUT">Out</option><option value="ADJUST">Adjust</option>
        </Select>
        <Select value={reason} onChange={(e) => { setReason(e.target.value); setPage(0) }} placeholder="All reasons" className="w-48">
          {Object.entries(MOVEMENT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPage(0) }} />
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.content}
        page={data}
        onPageChange={setPage}
        dense
        onRowClick={(m) => navigate(`/app/inventory/products/${m.productId}`)}
        columns={[
          { key: 'createdAt', header: 'When', cell: (m) => <span className="tabular whitespace-nowrap text-muted">{fmtDateTime(m.createdAt)}</span> },
          { key: 'product', header: 'Product', cell: (m) => <div><p className="font-semibold">{m.productName}</p><p className="text-xs text-muted">{m.sku}</p></div> },
          { key: 'type', header: 'Type', cell: (m) => <Badge tone={TYPE_TONE[m.type]}>{m.type}</Badge> },
          { key: 'reason', header: 'Reason', cell: (m) => MOVEMENT_REASONS[m.reason] || m.reason },
          { key: 'quantity', header: 'Qty', align: 'right', cell: (m) => <span className={cn('font-semibold', m.quantity > 0 ? 'text-success-700 dark:text-emerald-300' : 'text-danger-700 dark:text-red-300')}>{m.quantity > 0 ? '+' : ''}{num(m.quantity)} <span className="text-xs font-normal text-muted">{UNIT_LABEL[m.unit]}</span></span> },
          { key: 'unitCost', header: 'Unit cost', align: 'right', cell: (m) => peso(m.unitCost) },
          { key: 'balanceAfter', header: 'Balance', align: 'right', cell: (m) => num(m.balanceAfter) },
          { key: 'ref', header: 'Reference', cell: (m) => <span className="text-muted">{m.referenceNo || '—'}</span> },
        ]}
        empty={<EmptyState icon={ArrowLeftRight} title="No movements in this period" message="Change the date range or filters." />}
      />
    </>
  )
}
