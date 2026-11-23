import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Receipt as ReceiptIcon } from 'lucide-react'
import { Button, Card, CardHeader, DescriptionList, EmptyState, Field, Modal, PageHeader, Skeleton, StatusBadge, Textarea } from '@/components/ui'
import { Receipt } from '@/components/shared/Receipt'
import { useSale, useVoidSale } from '@/features/sales'
import { fmtDateTime, num, peso } from '@/lib/format'

export default function SaleDetailPage() {
  const { id } = useParams()
  const { data: sale, isLoading } = useSale(id)
  const voidSale = useVoidSale()
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState('')

  if (isLoading) return <Skeleton className="h-96 rounded-card" />
  if (!sale) return <EmptyState icon={ReceiptIcon} title="Sale not found" />

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Sales history', to: '/app/sales' }, { label: sale.saleNumber }]}
        title={<span className="flex flex-wrap items-center gap-3">{sale.saleNumber} <StatusBadge kind="sale" status={sale.status} /></span>}
        subtitle={`${fmtDateTime(sale.soldAt)} · ${sale.customerName}`}
        actions={sale.status === 'COMPLETED' && <Button variant="danger-soft" icon={Ban} onClick={() => setVoiding(true)}>Void sale</Button>}
      />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Line items" />
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                <tbody>
                  {sale.items.map((i) => (
                    <tr key={i.id} className="border-t border-line/60">
                      <td className="px-3 py-3"><p className="font-semibold">{i.description}</p><p className="text-xs text-muted">{i.lineType === 'SERVICE' ? 'Service' : 'Product'}</p></td>
                      <td className="tabular px-3 py-3 text-right">{num(i.quantity)}</td>
                      <td className="tabular px-3 py-3 text-right">{peso(i.unitPrice)}</td>
                      <td className="tabular px-3 py-3 text-right text-muted">{peso(i.costTotal)}</td>
                      <td className="tabular px-3 py-3 text-right font-semibold">{peso(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-5">
            <DescriptionList items={[
              { label: 'Subtotal', value: peso(sale.subtotal) },
              { label: 'Discount', value: sale.discountAmount > 0 ? `−${peso(sale.discountAmount)}` : '—' },
              { label: 'Total', value: peso(sale.total) },
              { label: 'Cost of goods / materials', value: peso(sale.costTotal) },
              { label: 'Gross profit', value: peso(sale.grossProfit) },
              { label: 'Source', value: sale.jobOrderId ? <Link className="text-primary hover:underline" to={`/app/jobs/${sale.jobOrderId}`}>Job order</Link> : 'POS' },
              sale.status === 'VOIDED' && { label: 'Voided', value: `${fmtDateTime(sale.voidedAt)} — ${sale.voidReason}` },
            ]} />
          </Card>
        </div>
        <Card>
          <CardHeader title="Receipt" subtitle="Reprint on a thermal printer or download a PDF" />
          <div className="p-5"><Receipt sale={sale} /></div>
        </Card>
      </div>

      <Modal open={voiding} onClose={() => setVoiding(false)} size="sm" title={`Void ${sale.saleNumber}?`}
        description={sale.jobOrderId ? 'The job order will reopen as Ready for pickup.' : 'All products and materials in this sale return to stock.'}
        footer={<><Button variant="secondary" onClick={() => setVoiding(false)}>Keep sale</Button><Button variant="danger" disabled={!reason.trim()} loading={voidSale.isPending} onClick={() => voidSale.mutate({ id, reason }, { onSuccess: () => setVoiding(false) })}>Void sale</Button></>}>
        <Field label="Reason" required><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong item rung up" /></Field>
      </Modal>
    </>
  )
}
