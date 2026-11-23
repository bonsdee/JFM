import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Banknote, Boxes, CalendarClock, ClipboardList, PackagePlus, Printer, ShoppingCart, TrendingUp, Wallet } from 'lucide-react'
import { useDashboard } from '@/features/admin'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Segmented, Skeleton, StatCard, StatusBadge } from '@/components/ui'
import { DonutChart, HBarChart, Legend, METHOD_SLOT, StackedBarChart, TrendChart, foldOther, useChartTheme } from '@/components/charts/ChartKit'
import { PAYMENT_LABEL } from '@/lib/constants'
import { fmtShort, num, peso, relative } from '@/lib/format'

const RANGES = [{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '12m', label: '12 months' }]

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const [range, setRange] = useState('30d')
  const { data, isLoading, isError, error, refetch } = useDashboard(range)
  const navigate = useNavigate()
  const t = useChartTheme()
  const k = data?.kpis

  if (isError) {
    return <EmptyState icon={AlertTriangle} title="Dashboard could not load" message={error.message} action={<Button onClick={() => refetch()}>Try again</Button>} />
  }

  return (
    <>
      <PageHeader
        title={greeting()}
        subtitle="Here's how the shop is doing."
        actions={
          <>
            <Link to="/app/jobs/new"><Button variant="secondary" icon={Printer}>New job order</Button></Link>
            <Link to="/app/pos"><Button icon={ShoppingCart}>New sale</Button></Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Today's sales" value={peso(k?.todaySales.value)} change={k?.todaySales.changePct} hint={k ? `${k.todaySales.hint} · vs yesterday` : ''} icon={Banknote} loading={isLoading} to="/app/sales" />
        <StatCard label="This month" value={peso(k?.monthSales.value)} change={k?.monthSales.changePct} hint={k?.monthSales.hint} icon={TrendingUp} tone="violet" loading={isLoading} to="/app/reports" />
        <StatCard label="Gross profit" value={peso(k?.grossProfit.value)} change={k?.grossProfit.changePct} hint={k?.grossProfit.hint} icon={Wallet} tone="success" loading={isLoading} to="/app/reports" />
        <StatCard label="Pending job orders" value={num(k?.pendingJobs.value)} hint={k?.pendingJobs.hint} icon={ClipboardList} tone="accent" loading={isLoading} to="/app/jobs" />
        <StatCard label="Low-stock items" value={num(k?.lowStock.value)} hint={k?.lowStock.hint} icon={AlertTriangle} tone={k?.lowStock.value ? 'warning' : 'success'} loading={isLoading} to="/app/purchasing/reorder" />
        <StatCard label="Inventory value" value={peso(k?.inventoryValue.value)} hint={k?.inventoryValue.hint} icon={Boxes} tone="neutral" loading={isLoading} to="/app/reports" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Sales trend"
            subtitle="Net sales and gross profit"
            action={<Segmented size="sm" value={range} onChange={setRange} options={RANGES} />}
          />
          <div className="px-3 pb-4 pt-2">
            <div className="mb-2 px-2"><Legend items={[{ label: 'Net sales', color: t.series[0] }, { label: 'Gross profit', color: t.series[2] }]} /></div>
            {isLoading ? <Skeleton className="mx-2 h-[280px]" /> : (
              <TrendChart data={data.salesTrend} series={[{ key: 'sales', label: 'Net sales', slot: 0 }, { key: 'profit', label: 'Gross profit', slot: 2 }]} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Sales by category" subtitle={RANGES.find((r) => r.value === range).label} />
          <div className="p-5">
            {isLoading ? <Skeleton className="h-52" /> : data.salesByCategory.length ? (
              <DonutChart data={foldOther(data.salesByCategory, 5)} />
            ) : <p className="py-10 text-center text-sm text-muted">No sales in this period.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Products vs services" subtitle="Revenue mix per period" />
          <div className="px-3 pb-4 pt-2">
            <div className="mb-2 px-2"><Legend items={[{ label: 'Products', color: t.series[0] }, { label: 'Services', color: t.series[1] }]} /></div>
            {isLoading ? <Skeleton className="mx-2 h-[260px]" /> : (
              <StackedBarChart data={data.salesTrend} series={[{ key: 'products', label: 'Products', slot: 0 }, { key: 'services', label: 'Services', slot: 1 }]} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Payment methods" subtitle="Money received" />
          <div className="p-5">
            {isLoading ? <Skeleton className="h-52" /> : data.paymentSplit.length ? (
              <DonutChart
                data={data.paymentSplit.map((p) => ({ ...p, name: PAYMENT_LABEL[p.name] || p.name }))}
                colorFor={(r, i, s) => s[METHOD_SLOT[data.paymentSplit[i].name] ?? i]}
                centerLabel="Collected"
              />
            ) : <p className="py-10 text-center text-sm text-muted">No payments yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <Card className="2xl:col-span-1">
          <CardHeader title="Top 5 best sellers" subtitle="By revenue" />
          <div className="p-4">
            {isLoading ? <Skeleton className="h-52" /> : data.topSellers.length ? <HBarChart data={data.topSellers} labelKey="name" valueKey="revenue" /> : <p className="py-10 text-center text-sm text-muted">No sales yet.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent transactions" action={<Link to="/app/sales" className="text-sm font-semibold text-primary hover:underline">View all</Link>} />
          <ul className="divide-y divide-line/60 px-2 pb-2 pt-3">
            {isLoading && [0, 1, 2, 3].map((i) => <li key={i} className="px-3 py-3"><Skeleton className="h-8" /></li>)}
            {data?.recentTransactions.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => navigate(`/app/sales/${s.id}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-subtle">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.saleNumber} <span className="font-normal text-muted">· {s.customer}</span></p>
                    <p className="text-xs text-muted">{relative(s.soldAt)}{s.source === 'JOB_ORDER' ? ' · job order' : ''}</p>
                  </div>
                  <span className="tabular text-sm font-bold">{peso(s.total)}</span>
                </button>
              </li>
            ))}
            {data && !data.recentTransactions.length && <li className="px-3 py-8 text-center text-sm text-muted">No sales yet.</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Upcoming job due dates" action={<Link to="/app/jobs" className="text-sm font-semibold text-primary hover:underline">Board</Link>} />
          <ul className="divide-y divide-line/60 px-2 pb-2 pt-3">
            {isLoading && [0, 1, 2].map((i) => <li key={i} className="px-3 py-3"><Skeleton className="h-8" /></li>)}
            {data?.upcomingJobs.map((j) => (
              <li key={j.id}>
                <button type="button" onClick={() => navigate(`/app/jobs/${j.id}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-subtle">
                  <CalendarClock className={j.overdue ? 'h-4 w-4 shrink-0 text-danger' : 'h-4 w-4 shrink-0 text-muted'} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{j.jobNumber} <span className="font-normal text-muted">· {j.customer}</span></p>
                    <p className={j.overdue ? 'text-xs font-semibold text-danger' : 'text-xs text-muted'}>{j.overdue ? 'Overdue · ' : ''}{fmtShort(j.dueAt)}</p>
                  </div>
                  <StatusBadge kind="job" status={j.status} />
                </button>
              </li>
            ))}
            {data && !data.upcomingJobs.length && <li className="px-3 py-8 text-center text-sm text-muted">No open jobs with due dates.</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Low stock" action={<Link to="/app/purchasing/reorder" className="text-sm font-semibold text-primary hover:underline">Reorder</Link>} />
          <ul className="divide-y divide-line/60 px-2 pb-2 pt-3">
            {isLoading && [0, 1, 2].map((i) => <li key={i} className="px-3 py-3"><Skeleton className="h-8" /></li>)}
            {data?.lowStock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link to={`/app/inventory/products/${p.id}`} className="block truncate text-sm font-semibold hover:text-primary">{p.name}</Link>
                  <p className="tabular text-xs text-muted">{num(p.stockOnHand)} left · reorder at {num(p.reorderLevel)}</p>
                </div>
                {p.stockStatus === 'OUT' && <Badge tone="danger">Out</Badge>}
                <Button size="xs" variant="soft" icon={PackagePlus} onClick={() => navigate(`/app/stock/in?product=${p.id}`)}>Restock</Button>
              </li>
            ))}
            {data && !data.lowStock.length && <li className="px-3 py-8 text-center text-sm text-muted">Everything is well stocked.</li>}
          </ul>
        </Card>
      </div>
    </>
  )
}
