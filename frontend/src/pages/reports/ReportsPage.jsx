import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import { Button, Card, CardHeader, DateRangePicker, Input, PageHeader, Segmented, Skeleton, StatCard, Tabs } from '@/components/ui'
import { DonutChart, GroupedBarChart, HBarChart, Legend, METHOD_SLOT, TrendChart, foldOther, useChartTheme } from '@/components/charts/ChartKit'
import { useReport } from '@/features/admin'
import { fetchFile } from '@/lib/files'
import { MOVEMENT_REASONS, PAYMENT_LABEL } from '@/lib/constants'
import { fmtDate, fmtDateTime, humanize, monthStartISO, num, peso, pct, todayISO } from '@/lib/format'

const REPORTS = [
  { value: 'sales', label: 'Sales' },
  { value: 'profit-loss', label: 'Profit & loss' },
  { value: 'cash-closing', label: 'End of day' },
  { value: 'best-sellers', label: 'Best / worst sellers' },
  { value: 'services-performance', label: 'Services' },
  { value: 'inventory-valuation', label: 'Inventory value' },
  { value: 'stock-movements', label: 'Stock movement' },
  { value: 'low-stock', label: 'Low stock' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'expenses', label: 'Expenses' },
]
const NO_RANGE = ['inventory-valuation', 'low-stock']

/** Labels + formatting for summary keys returned by the API. */
const SUMMARY = {
  netSales: ['Net sales', peso], orders: ['Orders', num], grossProfit: ['Gross profit', peso], averageOrder: ['Average order', peso], margin: ['Margin', pct],
  revenue: ['Revenue', peso], cogs: ['Cost of goods', peso], expenses: ['Expenses', peso], netProfit: ['Net profit', peso], netMargin: ['Net margin', pct],
  inventoryValue: ['Inventory at cost', peso], materialsValue: ['Materials at cost', peso], retailValue: ['Retail value', peso], items: ['Items', num], potentialMargin: ['Potential margin (retail)', peso],
  movements: ['Movements', num], products: ['Products moved', num], reasons: ['Reasons', num],
  top: ['Top item', (v) => v || '—'], marginPct: ['Margin', pct], openJobs: ['Open jobs', num], margin_: ['Margin', peso],
  ordered: ['Ordered', peso], received: ['Received', peso], paid: ['Paid', peso], payables: ['Payables', peso],
  lowStock: ['Low', num], outOfStock: ['Out of stock', num], total: ['Total', (v) => (typeof v === 'number' && v > 999 ? peso(v) : num(v))],
  entries: ['Entries', num], topCategory: ['Top category', (v) => v || '—'],
  salesCount: ['Sales', num], salesTotal: ['Sales total', peso], voids: ['Voids', num], voidedTotal: ['Voided amount', peso],
  collected: ['Money collected', peso], openJobPayments: ['Job downpayments', peso], expectedCashInDrawer: ['Expected cash in drawer', peso],
}

function cell(col, v) {
  if (v === null || v === undefined || v === '') return '—'
  switch (col.type) {
    case 'MONEY': return peso(v)
    case 'NUMBER': return num(v)
    case 'PERCENT': return pct(v)
    case 'DATE': return fmtDate(v)
    case 'DATETIME': return fmtDateTime(v)
    default:
      if (col.key === 'method' || col.key === 'payment_method') return PAYMENT_LABEL[v] || v
      if (col.key === 'status' || col.key === 'model') return humanize(v)
      return String(v)
  }
}

function ReportChart({ type, data }) {
  const t = useChartTheme()
  const chart = data.chart || []
  if (!chart.length) return <p className="py-12 text-center text-sm text-muted">No data for this period.</p>
  switch (type) {
    case 'sales':
      return <><div className="mb-2"><Legend items={[{ label: 'Net sales', color: t.series[0] }, { label: 'Gross profit', color: t.series[2] }]} /></div><TrendChart data={chart} series={[{ key: 'net', label: 'Net sales', slot: 0 }, { key: 'profit', label: 'Gross profit', slot: 2 }]} /></>
    case 'profit-loss':
      return <><div className="mb-2"><Legend items={[{ label: 'Revenue', color: t.series[0] }, { label: 'Cost of goods', color: t.series[1] }, { label: 'Expenses', color: t.series[2] }]} /></div>
        <GroupedBarChart data={chart} series={[{ key: 'revenue', label: 'Revenue', slot: 0 }, { key: 'cogs', label: 'Cost of goods', slot: 1 }, { key: 'expenses', label: 'Expenses', slot: 2 }]} /></>
    case 'inventory-valuation':
    case 'expenses':
    case 'purchases':
      return <DonutChart data={foldOther(chart.map((r) => ({ name: r.label, value: Number(r.value) })), 5)} />
    case 'cash-closing':
      return <DonutChart data={chart.map((r) => ({ name: PAYMENT_LABEL[r.label], value: Number(r.value), key: r.label }))} colorFor={(r, i, s) => s[METHOD_SLOT[r.key] ?? i]} centerLabel="Collected" />
    case 'stock-movements':
      return <HBarChart data={chart.map((r) => ({ name: MOVEMENT_REASONS[r.label] || r.label, value: Number(r.count) }))} money={false} />
    case 'best-sellers':
    case 'services-performance':
      return <HBarChart data={chart.slice(0, 10).map((r) => ({ name: r.label, value: Number(r.revenue) }))} />
    case 'low-stock':
      return <><div className="mb-2"><Legend items={[{ label: 'On hand', color: t.series[0] }, { label: 'Reorder level', color: t.series[1] }]} /></div>
        <GroupedBarChart money={false} data={chart.slice(0, 12)} series={[{ key: 'onHand', label: 'On hand', slot: 0 }, { key: 'reorderLevel', label: 'Reorder level', slot: 1 }]} /></>
    default:
      return null
  }
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') || 'sales'
  const [range, setRange] = useState({ from: monthStartISO(), to: todayISO() })
  const [day, setDay] = useState(todayISO())
  const [groupBy, setGroupBy] = useState('')
  const [order, setOrder] = useState('best')
  const query = type === 'cash-closing' ? { to: day } : NO_RANGE.includes(type) ? {} : { ...range, groupBy: type === 'sales' ? groupBy || undefined : undefined, order: type === 'best-sellers' ? order : undefined }
  const { data, isLoading, isFetching } = useReport(type, query)

  const exportAs = (format) => fetchFile(`/reports/${type}/export`, { params: { ...query, format } }).catch((e) => toast.error(e.message))
  const summary = data ? Object.entries(data.summary || {}).filter(([k]) => k !== 'date' && SUMMARY[k]) : []

  return (
    <>
      <PageHeader title="Reports" subtitle="Every report has a chart, a table and PDF / Excel export."
        actions={<>
          <Button variant="secondary" icon={FileText} onClick={() => exportAs('PDF')}>PDF</Button>
          <Button variant="secondary" icon={FileSpreadsheet} onClick={() => exportAs('XLSX')}>Excel</Button>
          <Button variant="ghost" icon={FileDown} onClick={() => exportAs('CSV')}>CSV</Button>
        </>} />
      <Tabs className="mb-4" value={type} onChange={(v) => setParams({ type: v })} tabs={REPORTS} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {type === 'cash-closing' ? (
          <label className="flex items-center gap-2 text-sm text-muted">Closing for <Input type="date" value={day} max={todayISO()} onChange={(e) => setDay(e.target.value)} className="w-44" /></label>
        ) : !NO_RANGE.includes(type) ? <DateRangePicker value={range} onChange={setRange} /> : <p className="text-sm text-muted">Snapshot as of today</p>}
        {type === 'sales' && <Segmented size="sm" value={groupBy} onChange={setGroupBy} options={[{ value: '', label: 'Auto' }, { value: 'DAY', label: 'Daily' }, { value: 'WEEK', label: 'Weekly' }, { value: 'MONTH', label: 'Monthly' }]} />}
        {type === 'best-sellers' && <Segmented size="sm" value={order} onChange={setOrder} options={[{ value: 'best', label: 'Best sellers' }, { value: 'worst', label: 'Slow movers' }]} />}
      </div>

      {isLoading ? <Skeleton className="h-96 rounded-card" /> : data && (
        <div className={isFetching ? 'opacity-70 transition' : 'transition'}>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summary.map(([k, v]) => <StatCard key={k} label={SUMMARY[k][0]} value={SUMMARY[k][1](v)} />)}
          </div>
          <Card className="mb-4">
            <CardHeader title={data.title} subtitle={data.period} />
            <div className="p-5"><ReportChart type={type} data={data} /></div>
          </Card>
          <Card className="overflow-hidden">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="border-b border-line bg-subtle/60">{data.table.columns.map((c) => <th key={c.key} className={`whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted ${['MONEY', 'NUMBER', 'PERCENT'].includes(c.type) ? 'text-right' : 'text-left'}`}>{c.label}</th>)}</tr></thead>
                <tbody>
                  {data.table.rows.map((r, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-0">
                      {data.table.columns.map((c) => <td key={c.key} className={`px-4 py-2.5 ${['MONEY', 'NUMBER', 'PERCENT'].includes(c.type) ? 'tabular text-right' : ''} ${String(r[c.key]).toUpperCase() === r[c.key] && c.key === 'line' ? 'font-bold' : ''}`}>{cell(c, r[c.key])}</td>)}
                    </tr>
                  ))}
                  {!data.table.rows.length && <tr><td colSpan={data.table.columns.length} className="px-4 py-10 text-center text-muted">No data for this period.</td></tr>}
                </tbody>
                {data.table.totals && data.table.rows.length > 0 && (
                  <tfoot><tr className="border-t-2 border-line bg-subtle/40 font-bold">{data.table.columns.map((c) => <td key={c.key} className={`px-4 py-3 ${['MONEY', 'NUMBER', 'PERCENT'].includes(c.type) ? 'tabular text-right' : ''}`}>{data.table.totals[c.key] !== undefined ? cell(c, data.table.totals[c.key]) : ''}</td>)}</tr></tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
