import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { ProductPicker } from '@/components/shared/Pickers'
import { useProduct } from '@/features/products'
import { useStockIn, useStockOut } from '@/features/stock'
import { MANUAL_IN_REASONS, MANUAL_OUT_REASONS, MOVEMENT_REASONS, UNIT_LABEL } from '@/lib/constants'
import { num, peso } from '@/lib/format'

let uid = 0
const line = (p) => ({ key: ++uid, product: p || null, quantity: '', unitCost: p?.costPrice ?? '' })

/** Multi-item Stock In / Stock Out form. Each line becomes one ledger movement, posted atomically. */
export default function StockFormPage({ mode }) {
  const isIn = mode === 'in'
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const preset = params.get('product')
  const { data: presetProduct } = useProduct(preset)
  const [reason, setReason] = useState(isIn ? 'PURCHASE_RECEIVED' : 'DAMAGED')
  const [referenceNo, setRef] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([line()])
  const [errors, setErrors] = useState({})
  const stockIn = useStockIn()
  const stockOut = useStockOut()
  const mutation = isIn ? stockIn : stockOut

  useEffect(() => {
    if (presetProduct) setLines([line({ ...presetProduct, costPrice: presetProduct.costPrice })])
  }, [presetProduct])

  const update = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0)

  const submit = () => {
    const errs = {}
    lines.forEach((l) => {
      if (!l.product) errs[l.key] = 'Choose a product'
      else if (!(Number(l.quantity) > 0)) errs[l.key] = 'Enter a quantity'
      else if (!isIn && Number(l.quantity) > Number(l.product.stockOnHand)) errs[l.key] = `Only ${num(l.product.stockOnHand)} on hand`
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    mutation.mutate(
      {
        reason, referenceNo: referenceNo || null, notes: notes || null,
        items: lines.map((l) => (isIn ? { productId: l.product.id, quantity: Number(l.quantity), unitCost: l.unitCost === '' ? null : Number(l.unitCost) } : { productId: l.product.id, quantity: Number(l.quantity) })),
      },
      { onSuccess: () => navigate('/app/stock') },
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Stock ledger', to: '/app/stock' }, { label: isIn ? 'Stock in' : 'Stock out' }]}
        title={isIn ? 'Stock in' : 'Stock out'}
        subtitle={isIn ? 'Receive items outside a purchase order. Unit cost updates the weighted average.' : 'Remove damaged, expired or returned items.'}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_130px_140px_40px] gap-3 px-1 text-xs font-semibold text-muted md:grid">
              <span>Product</span><span>Quantity</span>{isIn ? <span>Unit cost</span> : <span>On hand</span>}<span />
            </div>
            {lines.map((l) => (
              <div key={l.key} className="grid gap-3 rounded-2xl border border-line/70 p-3 md:grid-cols-[1fr_130px_140px_40px] md:border-0 md:p-0">
                <div>
                  <ProductPicker value={l.product?.id} initialLabel={l.product ? `${l.product.name} (${l.product.sku})` : ''} invalid={!!errors[l.key]}
                    onChange={(p) => update(l.key, { product: p, unitCost: isIn ? (l.unitCost || '') : '' })} />
                  {errors[l.key] && <p className="mt-1 text-xs font-medium text-danger">{errors[l.key]}</p>}
                </div>
                <Input type="number" min="0" step="0.001" placeholder="0" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })}
                  suffix={l.product ? UNIT_LABEL[l.product.unit] : undefined} aria-label="Quantity" />
                {isIn ? (
                  <Input type="number" min="0" step="0.01" prefix="₱" placeholder="Same as avg" value={l.unitCost} onChange={(e) => update(l.key, { unitCost: e.target.value })} aria-label="Unit cost" />
                ) : (
                  <span className="tabular flex h-10 items-center px-1 text-sm text-muted">{l.product ? `${num(l.product.stockOnHand)} ${UNIT_LABEL[l.product.unit]}` : '—'}</span>
                )}
                <Button variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="soft" size="sm" icon={Plus} onClick={() => setLines((ls) => [...ls, line()])}>Add another item</Button>
          </div>
        </Card>

        <Card className="h-fit space-y-4 p-5">
          <Field label="Reason" htmlFor="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {(isIn ? MANUAL_IN_REASONS : MANUAL_OUT_REASONS).map((r) => <option key={r} value={r}>{MOVEMENT_REASONS[r]}</option>)}
            </Select>
          </Field>
          <Field label="Reference no." htmlFor="ref" hint="Delivery receipt, invoice, etc."><Input id="ref" value={referenceNo} onChange={(e) => setRef(e.target.value)} /></Field>
          <Field label="Notes" htmlFor="notes"><Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          {isIn && (
            <div className="flex justify-between rounded-2xl bg-subtle px-4 py-3 text-sm">
              <span className="text-muted">Total cost</span><span className="tabular font-bold">{peso(total)}</span>
            </div>
          )}
          <Button className="w-full" size="lg" loading={mutation.isPending} onClick={submit}>
            {isIn ? `Post stock in (${lines.length})` : `Post stock out (${lines.length})`}
          </Button>
        </Card>
      </div>
    </>
  )
}
