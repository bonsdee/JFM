import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Ban, ClipboardList, FileDown, PackageCheck, Pencil, Send, Wallet } from 'lucide-react'
import { Button, Card, CardHeader, ConfirmDialog, DescriptionList, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, StatusBadge } from '@/components/ui'
import { usePoAction, usePurchaseOrder } from '@/features/purchasing'
import { fetchFile } from '@/lib/files'
import { PAYMENT_LABEL, PAYMENT_METHODS, UNIT_LABEL } from '@/lib/constants'
import { fmtDate, fmtDateTime, num, peso } from '@/lib/format'

export default function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const { data: po, isLoading } = usePurchaseOrder(id)
  const action = usePoAction()
  const [receiving, setReceiving] = useState(false)
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (isLoading) return <Skeleton className="h-96 rounded-card" />
  if (!po) return <EmptyState icon={ClipboardList} title="Purchase order not found" />
  const open = ['ORDERED', 'PARTIALLY_RECEIVED', 'DRAFT'].includes(po.status)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Purchase orders', to: '/app/purchasing/orders' }, { label: po.poNumber }]}
        title={<span className="flex flex-wrap items-center gap-3">{po.poNumber} <StatusBadge kind="po" status={po.status} /></span>}
        subtitle={`${po.supplierName} · ordered ${fmtDate(po.orderDate)}`}
        actions={
          <>
            <Button variant="secondary" icon={FileDown} onClick={() => fetchFile(`/purchase-orders/${id}/pdf`, { download: false }).catch((e) => toast.error(e.message))}>PDF</Button>
            {(po.status === 'DRAFT' || po.status === 'ORDERED') && !po.items.some((i) => i.qtyReceived > 0) && (
              <Link to={`/app/purchasing/orders/${id}/edit`}><Button variant="secondary" icon={Pencil}>Edit</Button></Link>
            )}
            {open && <Button variant="danger-soft" icon={Ban} onClick={() => setCancelling(true)}>{po.status === 'PARTIALLY_RECEIVED' ? 'Close short' : 'Cancel'}</Button>}
            {po.status !== 'DRAFT' && po.status !== 'CANCELLED' && po.balance > 0 && <Button variant="secondary" icon={Wallet} onClick={() => setPaying(true)}>Record payment</Button>}
            {po.status === 'DRAFT' && <Button icon={Send} loading={action.isPending} onClick={() => action.mutate({ id, action: 'order' })}>Mark as ordered</Button>}
            {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && <Button icon={PackageCheck} onClick={() => setReceiving(true)}>Receive items</Button>}
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Items" subtitle="Receiving posts PURCHASE_RECEIVED movements and updates average cost" />
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Ordered</th><th className="px-3 py-2 text-right">Received</th><th className="px-3 py-2 text-right">Unit cost</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
              <tbody>
                {po.items.map((i) => (
                  <tr key={i.id} className="border-t border-line/60">
                    <td className="px-3 py-3"><Link to={`/app/inventory/products/${i.productId}`} className="font-semibold hover:text-primary">{i.productName}</Link><p className="text-xs text-muted">{i.sku}</p></td>
                    <td className="tabular px-3 py-3 text-right">{num(i.qtyOrdered)} {UNIT_LABEL[i.unit]}</td>
                    <td className="tabular px-3 py-3 text-right">
                      <span className={i.remaining > 0 ? 'text-warning-700 dark:text-amber-300' : 'text-success-700 dark:text-emerald-300'}>{num(i.qtyReceived)}</span>
                      <div className="ml-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, (i.qtyReceived / i.qtyOrdered) * 100)}%` }} /></div>
                    </td>
                    <td className="tabular px-3 py-3 text-right">{peso(i.unitCost)}</td>
                    <td className="tabular px-3 py-3 text-right font-semibold">{peso(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-line"><td colSpan={4} className="px-3 py-3 text-right font-semibold">Total</td><td className="tabular px-3 py-3 text-right font-display text-lg font-extrabold">{peso(po.totalAmount)}</td></tr></tfoot>
            </table>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <DescriptionList items={[
              { label: 'Supplier', value: po.supplierName },
              { label: 'Contact', value: [po.supplierPhone, po.supplierEmail].filter(Boolean).join(' · ') || '—' },
              { label: 'Expected', value: fmtDate(po.expectedDate) },
              { label: 'Received value', value: peso(po.receivedValue) },
              { label: 'Paid', value: peso(po.amountPaid) },
              { label: 'Balance due', value: <span className={po.balance > 0 ? 'text-warning-700 dark:text-amber-300' : ''}>{peso(po.balance)}</span> },
            ]} />
            {po.notes && <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{po.notes}</p>}
          </Card>
          <Card>
            <CardHeader title="Supplier payments" />
            <ul className="divide-y divide-line/60 p-3">
              {!po.payments.length && <li className="px-2 py-4 text-sm text-muted">No payments yet.</li>}
              {po.payments.map((p) => (
                <li key={p.id} className="flex justify-between px-2 py-2.5 text-sm">
                  <span><span className="font-medium">{PAYMENT_LABEL[p.method]}</span><span className="block text-xs text-muted">{fmtDateTime(p.paidAt)}{p.referenceNo ? ` · ${p.referenceNo}` : ''}</span></span>
                  <span className="tabular font-semibold">{peso(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <ReceiveModal po={po} open={receiving} onClose={() => setReceiving(false)} action={action} />
      <PaymentModal po={po} open={paying} onClose={() => setPaying(false)} action={action} />
      <ConfirmDialog open={cancelling} onClose={() => setCancelling(false)} loading={action.isPending}
        title={po.status === 'PARTIALLY_RECEIVED' ? `Close ${po.poNumber} short?` : `Cancel ${po.poNumber}?`}
        confirmLabel={po.status === 'PARTIALLY_RECEIVED' ? 'Close purchase order' : 'Cancel purchase order'}
        message={po.status === 'PARTIALLY_RECEIVED' ? 'Received items stay in stock. Remaining quantities are cancelled and the total is reduced to the received value.' : 'Nothing has been received, so stock is unaffected.'}
        onConfirm={() => action.mutate({ id: po.id, action: 'cancel' }, { onSuccess: () => setCancelling(false) })} />
    </>
  )
}

function ReceiveModal({ po, open, onClose, action }) {
  const [qty, setQty] = useState({})
  const [notes, setNotes] = useState('')
  const pending = po.items.filter((i) => i.remaining > 0)
  const receiveAll = () => setQty(Object.fromEntries(pending.map((i) => [i.id, i.remaining])))
  const submit = () => {
    const lines = Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([itemId, v]) => ({ itemId, quantity: Number(v) }))
    action.mutate({ id: po.id, action: 'receive', body: { lines, notes: notes || null } }, { onSuccess: () => { setQty({}); onClose() } })
  }
  return (
    <Modal open={open} onClose={onClose} title={`Receive ${po.poNumber}`} description="Enter what actually arrived. Partial deliveries are fine." size="lg"
      footer={<><Button variant="secondary" onClick={receiveAll}>Fill all remaining</Button><Button loading={action.isPending} onClick={submit}>Post receipt</Button></>}>
      <div className="space-y-3">
        {pending.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1"><p className="font-semibold">{i.productName}</p><p className="tabular text-xs text-muted">{num(i.remaining)} of {num(i.qtyOrdered)} {UNIT_LABEL[i.unit]} remaining</p></div>
            <Input type="number" min="0" max={i.remaining} step="0.001" className="w-32" value={qty[i.id] ?? ''} placeholder="0" onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })} aria-label={`Received ${i.productName}`} />
          </div>
        ))}
        <Field label="Delivery note / DR number"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

function PaymentModal({ po, open, onClose, action }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [referenceNo, setRef] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Record supplier payment" description={`Balance due ${peso(po.balance)}`} size="sm"
      footer={<Button loading={action.isPending} disabled={!(Number(amount) > 0)} onClick={() => action.mutate({ id: po.id, action: 'payments', body: { amount: Number(amount), method, referenceNo: referenceNo || null } }, { onSuccess: () => { setAmount(''); onClose() } })}>Record payment</Button>}>
      <div className="space-y-4">
        <Field label="Amount" aside={<button type="button" className="text-xs font-semibold text-primary" onClick={() => setAmount(po.balance)}>Pay full balance</button>}>
          <Input type="number" min="0" step="0.01" prefix="₱" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)} options={PAYMENT_METHODS} /></Field>
        <Field label="Reference no."><Input value={referenceNo} onChange={(e) => setRef(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
