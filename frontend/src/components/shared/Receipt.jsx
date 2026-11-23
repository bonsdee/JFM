import { useState } from 'react'
import toast from 'react-hot-toast'
import { FileDown, Printer } from 'lucide-react'
import { Button, Segmented } from '@/components/ui'
import { useSettings } from '@/features/admin'
import { fetchFile } from '@/lib/files'
import { PAYMENT_LABEL } from '@/lib/constants'
import { fmtDateTime, num, peso } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Thermal-friendly receipt. "Print" uses the browser with @media print rules that hide everything
 * except `.print-area` sized to 58 or 80 mm; "PDF" downloads the server-rendered receipt.
 */
export function Receipt({ sale }) {
  const { data: biz } = useSettings()
  const [width, setWidth] = useState('80')
  const header = (biz?.receiptHeader || biz?.businessName || 'JFM PrintHub').split('\n')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented size="sm" value={width} onChange={setWidth} options={[{ value: '58', label: '58 mm' }, { value: '80', label: '80 mm' }]} />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={FileDown} onClick={() => fetchFile(`/sales/${sale.id}/receipt.pdf`, { params: { width, download: true } }).catch((e) => toast.error(e.message))}>PDF</Button>
          <Button size="sm" icon={Printer} onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <div className="flex justify-center rounded-2xl bg-subtle p-4">
        <div className={cn('print-area bg-white p-3 font-mono text-[11px] leading-snug text-slate-900 shadow-soft', width === '58' ? 'print-58 w-[220px]' : 'print-80 w-[300px]')}>
          <div className="text-center">
            {header.map((l, i) => <p key={i} className={i === 0 ? 'text-[13px] font-bold' : ''}>{l}</p>)}
            {biz?.address && <p>{biz.address}</p>}
            {biz?.phone && <p>{biz.phone}</p>}
            {biz?.tin && <p>TIN: {biz.tin}</p>}
          </div>
          <hr className="my-2 border-dashed border-slate-400" />
          <p>Receipt #: {sale.saleNumber}</p>
          <p>Date: {fmtDateTime(sale.soldAt)}</p>
          <p>Customer: {sale.customerName}</p>
          {sale.status === 'VOIDED' && <p className="mt-1 text-center font-bold">*** VOIDED ***</p>}
          <hr className="my-2 border-dashed border-slate-400" />
          {sale.items.map((i) => (
            <div key={i.id} className="mb-1">
              <p>{i.description}</p>
              <div className="flex justify-between"><span>  {num(i.quantity)} x {peso(i.unitPrice)}</span><span>{peso(i.lineTotal)}</span></div>
            </div>
          ))}
          <hr className="my-2 border-dashed border-slate-400" />
          <Row label="Subtotal" value={sale.subtotal} />
          {sale.discountAmount > 0 && <Row label={sale.discountType === 'PERCENT' ? `Discount (${num(sale.discountValue)}%)` : 'Discount'} value={-sale.discountAmount} />}
          {biz?.vatEnabled && sale.taxAmount > 0 && <Row label={biz.vatInclusive ? 'VAT (incl.)' : 'VAT'} value={sale.taxAmount} />}
          <Row label="TOTAL" value={sale.total} bold />
          {sale.payments.map((p) => <Row key={p.id} label={PAYMENT_LABEL[p.method]} value={p.amount} />)}
          {sale.changeDue > 0 && <><Row label="Tendered" value={sale.amountTendered} /><Row label="Change" value={sale.changeDue} bold /></>}
          <hr className="my-2 border-dashed border-slate-400" />
          <div className="text-center">{(biz?.receiptFooter || 'Thank you!').split('\n').map((l, i) => <p key={i}>{l}</p>)}</div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }) {
  return <div className={cn('flex justify-between', bold && 'text-[13px] font-bold')}><span>{label}</span><span>{peso(value)}</span></div>
}
