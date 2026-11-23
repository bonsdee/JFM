import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, Field, Input, PageHeader, Select, Skeleton, Textarea } from '@/components/ui'
import { ProductPicker } from '@/components/shared/Pickers'
import { useAllSuppliers, usePurchaseOrder, useSavePo } from '@/features/purchasing'
import { UNIT_LABEL } from '@/lib/constants'
import { peso, todayISO } from '@/lib/format'

let uid = 0
const newLine = (p = {}) => ({ key: ++uid, productId: p.productId || null, label: p.label || '', unit: p.unit, qtyOrdered: p.qtyOrdered ?? '', unitCost: p.unitCost ?? '' })

export default function PurchaseOrderFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: po, isLoading } = usePurchaseOrder(id)
  const { data: suppliers } = useAllSuppliers()
  const save = useSavePo()
  const [form, setForm] = useState({ supplierId: '', orderDate: todayISO(), expectedDate: '', notes: '' })
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!po) return
    setForm({ supplierId: po.supplierId, orderDate: po.orderDate || todayISO(), expectedDate: po.expectedDate || '', notes: po.notes || '' })
    setLines(po.items.map((i) => newLine({ productId: i.productId, label: `${i.productName} (${i.sku})`, unit: i.unit, qtyOrdered: i.qtyOrdered, unitCost: i.unitCost })))
  }, [po])

  const update = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const total = lines.reduce((s, l) => s + (Number(l.qtyOrdered) || 0) * (Number(l.unitCost) || 0), 0)

  const submit = () => {
    if (!form.supplierId) return setError('Choose a supplier')
    const valid = lines.filter((l) => l.productId && Number(l.qtyOrdered) > 0)
    if (!valid.length) return setError('Add at least one item with a quantity')
    setError('')
    save.mutate(
      { id, supplierId: form.supplierId, orderDate: form.orderDate || null, expectedDate: form.expectedDate || null, notes: form.notes || null,
        items: valid.map((l) => ({ productId: l.productId, qtyOrdered: Number(l.qtyOrdered), unitCost: Number(l.unitCost) || 0 })) },
      { onSuccess: (d) => navigate(`/app/purchasing/orders/${d.id}`) },
    )
  }

  if (id && isLoading) return <Skeleton className="h-96 rounded-card" />

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Purchase orders', to: '/app/purchasing/orders' }, { label: id ? po?.poNumber : 'New' }]}
        title={id ? `Edit ${po?.poNumber}` : 'New purchase order'}
        subtitle="Saved as a draft. Mark it ordered when you send it to the supplier."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="space-y-3 p-5">
          <div className="hidden grid-cols-[1fr_120px_140px_110px_40px] gap-3 px-1 text-xs font-semibold text-muted md:grid">
            <span>Item</span><span>Qty</span><span>Unit cost</span><span className="text-right">Amount</span><span />
          </div>
          {lines.map((l) => (
            <div key={l.key} className="grid items-center gap-3 rounded-2xl border border-line/70 p-3 md:grid-cols-[1fr_120px_140px_110px_40px] md:border-0 md:p-0">
              <ProductPicker value={l.productId} initialLabel={l.label}
                onChange={(p) => update(l.key, { productId: p.id, label: `${p.name} (${p.sku})`, unit: p.unit, unitCost: l.unitCost || '' })} />
              <Input type="number" min="0" step="0.001" placeholder="0" value={l.qtyOrdered} onChange={(e) => update(l.key, { qtyOrdered: e.target.value })} suffix={l.unit ? UNIT_LABEL[l.unit] : undefined} aria-label="Quantity" />
              <Input type="number" min="0" step="0.01" prefix="₱" value={l.unitCost} onChange={(e) => update(l.key, { unitCost: e.target.value })} aria-label="Unit cost" />
              <span className="tabular text-right text-sm font-semibold">{peso((Number(l.qtyOrdered) || 0) * (Number(l.unitCost) || 0))}</span>
              <Button variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="soft" size="sm" icon={Plus} onClick={() => setLines((ls) => [...ls, newLine()])}>Add item</Button>
        </Card>
        <Card className="h-fit space-y-4 p-5">
          <Field label="Supplier" required>
            <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} placeholder="Choose supplier">
              {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order date"><Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} /></Field>
            <Field label="Expected"><Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-between rounded-2xl bg-subtle px-4 py-3"><span className="text-sm text-muted">Total</span><span className="tabular font-display text-lg font-extrabold">{peso(total)}</span></div>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <Button size="lg" className="w-full" loading={save.isPending} onClick={submit}>{id ? 'Save changes' : 'Save draft'}</Button>
        </Card>
      </div>
    </>
  )
}
