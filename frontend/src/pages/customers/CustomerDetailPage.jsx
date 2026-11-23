import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, Pencil, Printer, RotateCcw, Users } from 'lucide-react'
import { Button, Card, CardHeader, DescriptionList, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge } from '@/components/ui'
import { CustomerModal } from './CustomersPage'
import { useArchiveCustomer, useCustomer } from '@/features/customers'
import { fmtDateTime, peso } from '@/lib/format'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useCustomer(id)
  const archive = useArchiveCustomer()
  const [editing, setEditing] = useState(false)

  if (isLoading) return <Skeleton className="h-96 rounded-card" />
  if (!data) return <EmptyState icon={Users} title="Customer not found" />
  const c = data.customer

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Customers', to: '/app/customers' }, { label: c.name }]}
        title={c.name}
        subtitle={[c.phone, c.facebookName && `FB: ${c.facebookName}`, c.archived && 'archived'].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button variant="secondary" icon={c.archived ? RotateCcw : Archive} onClick={() => archive.mutate({ id, archived: !c.archived })}>{c.archived ? 'Restore' : 'Archive'}</Button>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            <Link to="/app/jobs/new"><Button icon={Printer}>New job order</Button></Link>
          </>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Lifetime spend" value={peso(data.lifetimeSpend)} hint={`${data.salesCount} sales`} />
        <StatCard label="Outstanding balance" value={peso(data.outstandingBalance)} hint="Open job orders" tone={data.outstandingBalance > 0 ? 'warning' : 'success'} />
        <StatCard label="Job orders" value={data.jobCount} tone="violet" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
        <Card className="h-fit p-5">
          <DescriptionList className="sm:grid-cols-1" items={[
            { label: 'Phone', value: c.phone }, { label: 'Email', value: c.email }, { label: 'Facebook', value: c.facebookName },
            { label: 'Notes', value: c.notes }, { label: 'Customer since', value: fmtDateTime(c.createdAt) },
          ]} />
        </Card>
        <Card>
          <CardHeader title="Purchase & job history" />
          <ul className="divide-y divide-line/60 p-2">
            {!data.history.length && <li className="px-3 py-8 text-center text-sm text-muted">No history yet.</li>}
            {data.history.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => navigate(h.type === 'SALE' ? `/app/sales/${h.id}` : `/app/jobs/${h.id}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-subtle">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{h.number} <span className="font-normal text-muted">· {h.type === 'SALE' ? 'Sale' : 'Job order'}</span></p>
                    <p className="text-xs text-muted">{fmtDateTime(h.date)}</p>
                  </div>
                  <StatusBadge kind={h.type === 'SALE' ? 'sale' : 'job'} status={h.status} />
                  <div className="w-28 text-right">
                    <p className="tabular font-semibold">{peso(h.total)}</p>
                    {h.balance > 0 && <p className="tabular text-xs font-semibold text-warning-700 dark:text-amber-300">{peso(h.balance)} due</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <CustomerModal customer={editing ? c : null} onClose={() => setEditing(false)} />
    </>
  )
}
