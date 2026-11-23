import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Barcode, Boxes, Layers, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Modal, SearchInput, Segmented } from '@/components/ui'
import { CustomerPicker } from '@/components/shared/Pickers'
import { ServiceConfigurator } from '@/components/shared/ServiceConfigurator'
import { Receipt } from '@/components/shared/Receipt'
import { iconFor } from '@/components/landing/serviceIcons'
import { useProductOptions } from '@/features/products'
import { useServices } from '@/features/services'
import { useCheckout } from '@/features/sales'
import { useSettings } from '@/features/admin'
import { get } from '@/lib/api'
import { PAYMENT_METHODS, UNIT_LABEL } from '@/lib/constants'
import { num, peso } from '@/lib/format'
import { cn } from '@/lib/cn'

let uid = 0

/** Fast counter POS: search/scan products, price services, discount, tender, receipt. */
export default function PosPage() {
  const [q, setQ] = useState('')
  const { data: products, isFetching } = useProductOptions(q, false)
  const { data: services } = useServices()
  const { data: settings } = useSettings()
  const checkout = useCheckout()

  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState(null)
  const [discType, setDiscType] = useState('AMOUNT')
  const [discValue, setDiscValue] = useState('')
  const [method, setMethod] = useState('CASH')
  const [tendered, setTendered] = useState('')
  const [ref, setRef] = useState('')
  const [svcOpen, setSvcOpen] = useState(null)
  const [svcState, setSvcState] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [mobileCart, setMobileCart] = useState(false)

  const addProduct = (p) => {
    setCart((c) => {
      const existing = c.find((l) => l.type === 'PRODUCT' && l.product.id === p.id)
      if (existing) return c.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l))
      return [...c, { key: ++uid, type: 'PRODUCT', product: p, qty: 1, price: Number(p.sellingPrice) }]
    })
  }

  const onScan = async (e) => {
    if (e.key !== 'Enter' || !q.trim()) return
    try {
      const p = await get(`/products/barcode/${encodeURIComponent(q.trim())}`)
      addProduct(p)
      setQ('')
    } catch {
      if (products?.length === 1) { addProduct(products[0]); setQ('') }
    }
  }

  const addService = () => {
    if (!svcState?.quote) return
    setCart((c) => [...c, { key: ++uid, type: 'SERVICE', service: svcState.service, request: svcState.request, quote: svcState.quote, qty: Number(svcState.quote.quantity), price: Number(svcState.quote.total) }])
    setSvcOpen(null)
  }

  const lineTotal = (l) => (l.type === 'PRODUCT' ? l.qty * l.price : l.price)
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0)
  const discount = useMemo(() => {
    const v = Number(discValue) || 0
    return Math.min(subtotal, discType === 'PERCENT' ? (subtotal * Math.min(v, 100)) / 100 : v)
  }, [discValue, discType, subtotal])
  const net = subtotal - discount
  const vatExclusive = settings?.vatEnabled && !settings?.vatInclusive
  const tax = settings?.vatEnabled ? (settings.vatInclusive ? (net * settings.vatRate) / (100 + Number(settings.vatRate)) : (net * settings.vatRate) / 100) : 0
  const total = Math.round((vatExclusive ? net + tax : net) * 100) / 100
  const change = method === 'CASH' ? (Number(tendered) || 0) - total : 0
  const quickCash = [total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, 1000].filter((v, i, a) => v > 0 && v >= total && a.indexOf(v) === i).slice(0, 4)

  const reset = useCallback(() => { setCart([]); setCustomer(null); setDiscValue(''); setTendered(''); setRef(''); setMethod('CASH') }, [])

  const pay = () => {
    if (!cart.length) return
    if (method === 'CASH' && (Number(tendered) || 0) < total) { toast.error('Amount tendered is less than the total'); return }
    checkout.mutate({
      customerId: customer?.id || null,
      items: cart.map((l) => (l.type === 'PRODUCT'
        ? { type: 'PRODUCT', productId: l.product.id, quantity: l.qty, unitPrice: l.price }
        : { type: 'SERVICE', quote: l.request })),
      discountType: Number(discValue) > 0 ? discType : null,
      discountValue: Number(discValue) || 0,
      paymentMethod: method,
      amountTendered: method === 'CASH' ? Number(tendered) : null,
      referenceNo: ref || null,
    }, { onSuccess: (sale) => { setReceipt(sale); reset(); setMobileCart(false) } })
  }

  const cartPanel = (
    <Card className="flex h-full flex-col">
      <div className="border-b border-line/70 p-4"><CustomerPicker value={customer?.id} initialLabel={customer?.name} onChange={setCustomer} /></div>
      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {!cart.length && <EmptyState icon={ShoppingCart} title="Cart is empty" message="Tap a product or add a service." className="py-10" />}
        <AnimatePresence initial={false}>
          {cart.map((l) => (
            <motion.div key={l.key} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16, height: 0 }} className="rounded-2xl border border-line/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{l.type === 'PRODUCT' ? l.product.name : l.quote.serviceName}</p>
                  <p className="truncate text-xs text-muted">{l.type === 'PRODUCT' ? `${peso(l.price)} / ${UNIT_LABEL[l.product.unit]}` : l.quote.description}</p>
                </div>
                <button type="button" onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))} className="rounded-full p-1 text-muted hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                {l.type === 'PRODUCT' ? (
                  <div className="flex items-center gap-1 rounded-full bg-subtle p-0.5">
                    <button type="button" className="rounded-full p-1.5 hover:bg-surface" onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                    <input type="number" min="1" value={l.qty} onChange={(e) => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: Math.max(0.001, Number(e.target.value) || 1) } : x)))} className="tabular w-12 bg-transparent text-center text-sm font-semibold outline-none" aria-label="Quantity" />
                    <button type="button" className="rounded-full p-1.5 hover:bg-surface" onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                ) : <span className="text-xs text-muted">Service</span>}
                <span className="tabular font-bold">{peso(lineTotal(l))}</span>
              </div>
              {l.type === 'PRODUCT' && l.qty > Number(l.product.stockOnHand) && <p className="mt-1 text-xs font-medium text-danger">Only {num(l.product.stockOnHand)} in stock</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="space-y-3 border-t border-line/70 p-4">
        <div className="flex items-center gap-2">
          <Segmented size="sm" value={discType} onChange={setDiscType} options={[{ value: 'AMOUNT', label: '₱' }, { value: 'PERCENT', label: '%' }]} />
          <Input type="number" min="0" placeholder="Discount" value={discValue} onChange={(e) => setDiscValue(e.target.value)} className="!h-9" aria-label="Discount" />
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted"><span>Subtotal</span><span className="tabular">{peso(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-muted"><span>Discount</span><span className="tabular">−{peso(discount)}</span></div>}
          {settings?.vatEnabled && <div className="flex justify-between text-muted"><span>VAT {settings.vatInclusive ? '(incl.)' : ''}</span><span className="tabular">{peso(tax)}</span></div>}
          <div className="flex items-end justify-between pt-1"><span className="font-semibold">Total</span><span className="tabular font-display text-3xl font-extrabold">{peso(total)}</span></div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.value} type="button" onClick={() => setMethod(m.value)}
              className={cn('rounded-xl border px-1 py-2 text-xs font-semibold transition', method === m.value ? 'border-primary bg-primary-50 text-primary-700 dark:bg-primary/15 dark:text-white' : 'border-line text-muted hover:bg-subtle')}>
              {m.label}
            </button>
          ))}
        </div>
        {method === 'CASH' ? (
          <>
            <Input type="number" min="0" step="0.01" prefix="₱" placeholder="Amount tendered" value={tendered} onChange={(e) => setTendered(e.target.value)} aria-label="Amount tendered" />
            <div className="flex flex-wrap gap-1.5">
              {quickCash.map((v) => <button key={v} type="button" onClick={() => setTendered(String(v))} className="tabular rounded-full bg-subtle px-3 py-1 text-xs font-semibold hover:bg-line">{peso(v)}</button>)}
            </div>
            {Number(tendered) > 0 && <div className={cn('flex justify-between rounded-xl px-3 py-2 text-sm font-semibold', change >= 0 ? 'bg-success-50 text-success-700 dark:bg-success/15 dark:text-emerald-300' : 'bg-danger-50 text-danger-700')}><span>Change</span><span className="tabular">{peso(Math.max(change, 0))}</span></div>}
          </>
        ) : <Input placeholder="Reference no. (optional)" value={ref} onChange={(e) => setRef(e.target.value)} aria-label="Reference number" />}
        <Button size="lg" className="w-full" disabled={!cart.length || (method === 'CASH' && change < 0)} loading={checkout.isPending} onClick={pay}>Charge {peso(total)}</Button>
      </div>
    </Card>
  )

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1" onKeyDown={onScan}>
            <SearchInput value={q} onChange={setQ} placeholder="Search or scan a barcode, then press Enter" autoFocus className="w-full" />
            <Barcode className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          </div>
        </div>
        {/* Services quick row */}
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
          {services?.filter((s) => s.active).map((s) => {
            const Icon = iconFor(s.icon)
            return (
              <button key={s.id} type="button" onClick={() => setSvcOpen(s.id)} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-primary/50 hover:shadow-soft">
                <Icon className="h-4 w-4 text-primary" /> {s.name}
              </button>
            )
          })}
        </div>
        <div className="scrollbar-thin grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pb-24 sm:grid-cols-3 xl:grid-cols-4 lg:pb-2">
          {products?.map((p) => (
            <motion.button key={p.id} type="button" whileTap={{ scale: 0.96 }} onClick={() => addProduct(p)}
              className="card flex flex-col p-3 text-left transition hover:shadow-lift disabled:opacity-50" disabled={Number(p.stockOnHand) <= 0}>
              <div className="mb-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-subtle">
                {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Boxes className="h-7 w-7 text-muted" />}
              </div>
              <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
              <div className="mt-auto flex items-end justify-between pt-1">
                <span className="tabular font-bold text-primary-700 dark:text-primary">{peso(p.sellingPrice)}</span>
                <span className={cn('tabular text-xs', Number(p.stockOnHand) <= 0 ? 'font-semibold text-danger' : 'text-muted')}>{Number(p.stockOnHand) <= 0 ? 'Out' : num(p.stockOnHand)}</span>
              </div>
            </motion.button>
          ))}
          {!isFetching && !products?.length && <p className="col-span-full py-10 text-center text-sm text-muted">No products match “{q}”.</p>}
        </div>
      </div>

      <div className="hidden min-h-0 lg:block">{cartPanel}</div>

      {/* Mobile: sticky cart button + full-screen drawer */}
      <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden">
        <Button size="lg" className="w-full" icon={ShoppingCart} onClick={() => setMobileCart(true)}>{cart.length} item{cart.length === 1 ? '' : 's'} · {peso(total)}</Button>
      </div>
      <Modal open={mobileCart} onClose={() => setMobileCart(false)} title="Cart" size="md">{cartPanel}</Modal>

      <Modal open={!!svcOpen} onClose={() => setSvcOpen(null)} title="Add a service" size="md"
        footer={<><Button variant="secondary" onClick={() => setSvcOpen(null)}>Cancel</Button><Button icon={Layers} disabled={!svcState?.quote} onClick={addService}>Add {svcState?.quote ? peso(svcState.quote.total) : ''}</Button></>}>
        {svcOpen && <ServiceConfigurator services={services?.filter((s) => s.active)} initialServiceId={svcOpen} onChange={setSvcState} />}
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title={`Sale ${receipt?.saleNumber || ''} complete`}
        description={receipt?.changeDue > 0 ? `Give change: ${peso(receipt.changeDue)}` : undefined}
        footer={<Button onClick={() => setReceipt(null)}>New sale</Button>}>
        {receipt && <Receipt sale={receipt} />}
      </Modal>
    </div>
  )
}
