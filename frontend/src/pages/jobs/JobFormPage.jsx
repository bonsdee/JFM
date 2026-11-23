import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Skeleton, Textarea } from '@/components/ui'
import { CustomerPicker } from '@/components/shared/Pickers'
import { ServiceConfigurator } from '@/components/shared/ServiceConfigurator'
import { useServices } from '@/features/services'
import { useJob, useSaveJob } from '@/features/jobs'
import { PAYMENT_METHODS } from '@/lib/constants'
import { fromLocalInput, peso, toLocalInput } from '@/lib/format'

let uid = 0

/** Specs stored on a job item → configurator state (for editing). */
function specsToState(specs = {}) {
  return {
    quantity: specs.quantity ?? 1, widthFt: specs.widthFt ?? 3, heightFt: specs.heightFt ?? 5, pages: specs.pages ?? 1,
    colored: !!specs.colored, paperSize: specs.paperSize || 'SHORT', rush: !!specs.rush, notes: specs.notes || '',
    addons: Object.fromEntries((specs.addons || []).map((a) => [a.addonId, { on: true, qty: a.quantity }])),
  }
}

export default function JobFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: job, isLoading } = useJob(id)
  const { data: services } = useServices()
  const save = useSaveJob()
  const active = services?.filter((s) => s.active)

  const [customer, setCustomer] = useState(null)
  const [header, setHeader] = useState({ customerName: '', customerPhone: '', dueAt: '', notes: '', discountAmount: '' })
  const [items, setItems] = useState([])
  const [dp, setDp] = useState({ amount: '', method: 'CASH', referenceNo: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active?.length || items.length || id) return
    setItems([{ key: ++uid, current: null }])
  }, [active, items.length, id])

  useEffect(() => {
    if (!job) return
    setCustomer(job.customerId ? { id: job.customerId, name: job.customerName } : null)
    setHeader({ customerName: job.customerId ? '' : job.customerName === 'Walk-in' ? '' : job.customerName, customerPhone: job.customerPhone || '', dueAt: toLocalInput(job.dueAt), notes: job.notes || '', discountAmount: job.discountAmount || '' })
    setItems(job.items.map((i) => ({ key: ++uid, serviceId: i.serviceId, initial: specsToState(i.specs), current: null })))
  }, [job])

  const subtotal = items.reduce((s, i) => s + (i.current?.quote?.total || 0), 0)
  const total = Math.max(0, subtotal - (Number(header.discountAmount) || 0))

  const submit = () => {
    if (!customer && !header.customerName.trim()) return setError('Choose a customer or enter a name')
    const ready = items.filter((i) => i.current?.quote && i.current?.request)
    if (!ready.length || ready.length !== items.length) return setError('Every item needs valid specs (check the red messages).')
    setError('')
    save.mutate({
      id,
      customerId: customer?.id || null,
      customerName: customer ? null : header.customerName,
      customerPhone: header.customerPhone || null,
      dueAt: fromLocalInput(header.dueAt),
      notes: header.notes || null,
      discountAmount: Number(header.discountAmount) || 0,
      items: ready.map((i) => ({ quote: i.current.request })),
      downpayment: !id && Number(dp.amount) > 0 ? { amount: Number(dp.amount), method: dp.method, referenceNo: dp.referenceNo || null } : null,
    }, { onSuccess: (d) => navigate(`/app/jobs/${d.id}`) })
  }

  if ((id && isLoading) || !services) return <Skeleton className="h-96 rounded-card" />

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Job orders', to: '/app/jobs' }, { label: id ? job?.jobNumber : 'New' }]}
        title={id ? `Edit ${job?.jobNumber}` : 'New job order'}
        subtitle="Prices come from the same engine as the POS and website."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((it, idx) => (
            <Card key={it.key}>
              <CardHeader title={`Item ${idx + 1}`} action={items.length > 1 && <Button variant="ghost" size="icon-sm" onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} aria-label="Remove item"><Trash2 className="h-4 w-4" /></Button>} />
              <div className="p-5">
                <ServiceConfigurator services={active} initialServiceId={it.serviceId} initialSpecs={it.initial}
                  onChange={(current) => setItems((xs) => xs.map((x) => (x.key === it.key ? { ...x, current } : x)))} />
              </div>
            </Card>
          ))}
          <Button variant="soft" icon={Plus} onClick={() => setItems((xs) => [...xs, { key: ++uid, current: null }])}>Add another item</Button>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <Field label="Customer"><CustomerPicker value={customer?.id} initialLabel={customer?.name} onChange={setCustomer} /></Field>
            {!customer && <Field label="Walk-in name" htmlFor="cn"><Input id="cn" value={header.customerName} onChange={(e) => setHeader({ ...header, customerName: e.target.value })} /></Field>}
            <Field label="Mobile number" htmlFor="cp"><Input id="cp" type="tel" value={header.customerPhone} onChange={(e) => setHeader({ ...header, customerPhone: e.target.value })} placeholder="For pickup text" /></Field>
            <Field label="Due date & time" htmlFor="due"><Input id="due" type="datetime-local" value={header.dueAt} onChange={(e) => setHeader({ ...header, dueAt: e.target.value })} /></Field>
            <Field label="Design notes" htmlFor="notes"><Textarea id="notes" rows={3} value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} /></Field>
          </Card>
          <Card className="space-y-4 p-5">
            <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="tabular font-semibold">{peso(subtotal)}</span></div>
            <Field label="Discount" htmlFor="disc"><Input id="disc" type="number" min="0" step="0.01" prefix="₱" value={header.discountAmount} onChange={(e) => setHeader({ ...header, discountAmount: e.target.value })} /></Field>
            <div className="flex items-end justify-between border-t border-line pt-4"><span className="text-sm text-muted">Total</span><span className="tabular font-display text-2xl font-extrabold">{peso(total)}</span></div>
            {!id && (
              <div className="space-y-3 rounded-2xl bg-subtle p-4">
                <Field label="Downpayment" aside={<button type="button" className="text-xs font-semibold text-primary" onClick={() => setDp({ ...dp, amount: (total / 2).toFixed(2) })}>50%</button>}>
                  <Input type="number" min="0" step="0.01" prefix="₱" value={dp.amount} onChange={(e) => setDp({ ...dp, amount: e.target.value })} />
                </Field>
                {Number(dp.amount) > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={dp.method} onChange={(e) => setDp({ ...dp, method: e.target.value })} options={PAYMENT_METHODS} aria-label="Payment method" />
                    <Input placeholder="Ref no." value={dp.referenceNo} onChange={(e) => setDp({ ...dp, referenceNo: e.target.value })} aria-label="Reference number" />
                  </div>
                )}
              </div>
            )}
            {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
            <Button size="lg" className="w-full" loading={save.isPending} onClick={submit}>{id ? 'Save job order' : 'Create job order'}</Button>
          </Card>
        </div>
      </div>
    </>
  )
}
