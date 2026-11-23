import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Boxes, Minus, Pencil, Plus, SlidersHorizontal } from 'lucide-react'
import { Button, Card, CardHeader, DescriptionList, EmptyState, PageHeader, Pagination, Skeleton, StatusBadge } from '@/components/ui'
import { ProductFormDrawer } from './ProductFormDrawer'
import { useProduct, useProductMovements } from '@/features/products'
import { MOVEMENT_REASONS, UNIT_LABEL } from '@/lib/constants'
import { fmtDateTime, num, peso } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Product profile with its full movement timeline (the ledger, newest first). */
export default function ProductDetailPage() {
  const { id } = useParams()
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(false)
  const { data: p, isLoading } = useProduct(id)
  const { data: moves, isLoading: loadingMoves } = useProductMovements(id, page)

  if (isLoading) return <Skeleton className="h-96 rounded-card" />
  if (!p) return <EmptyState icon={Boxes} title="Product not found" />
  const unit = UNIT_LABEL[p.unit]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Products', to: '/app/inventory/products' }, { label: p.name }]}
        title={p.name}
        subtitle={`${p.sku}${p.barcode ? ` · ${p.barcode}` : ''}${p.archived ? ' · archived' : ''}`}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            <Link to={`/app/stock/out?product=${p.id}`}><Button variant="secondary" icon={Minus}>Stock out</Button></Link>
            <Link to={`/app/stock/in?product=${p.id}`}><Button icon={Plus}>Stock in</Button></Link>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-subtle">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <Boxes className="m-8 h-8 w-8 text-muted" />}
              </div>
              <div>
                <p className="text-sm text-muted">On hand</p>
                <p className="tabular font-display text-4xl font-extrabold">{num(p.stockOnHand)} <span className="text-base font-semibold text-muted">{unit}</span></p>
                <div className="mt-2"><StatusBadge kind="stock" status={p.stockStatus} /></div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <DescriptionList items={[
              { label: 'Category', value: p.categoryName },
              { label: 'Type', value: p.material ? 'Material (used by services)' : 'Retail item' },
              { label: 'Weighted avg cost', value: peso(p.costPrice) },
              !p.material && { label: 'Selling price', value: peso(p.sellingPrice) },
              { label: 'Stock value', value: peso(p.stockValue) },
              { label: 'Reorder level', value: `${num(p.reorderLevel)} ${unit}` },
              { label: 'Supplier', value: p.supplierName },
              { label: 'Location', value: p.location },
            ]} />
            {p.description && <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{p.description}</p>}
          </Card>
        </div>

        <Card>
          <CardHeader title="Movement history" subtitle="Every change to this item's stock, with reason and reference" />
          <div className="p-5">
            {loadingMoves && <Skeleton className="h-64" />}
            {!loadingMoves && !moves?.content.length && <p className="py-10 text-center text-sm text-muted">No movements yet.</p>}
            <ol className="relative space-y-1 border-l-2 border-line/70 pl-6">
              {moves?.content.map((m, i) => {
                const up = m.quantity > 0
                const Icon = m.type === 'ADJUST' ? SlidersHorizontal : up ? ArrowDownLeft : ArrowUpRight
                return (
                  <motion.li key={m.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }} className="relative pb-4">
                    <span className={cn('absolute -left-[37px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-surface',
                      up ? 'bg-success-50 text-success-700 dark:bg-success/15' : 'bg-danger-50 text-danger-700 dark:bg-danger/15')}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {MOVEMENT_REASONS[m.reason] || m.reason}
                        {m.referenceNo && <span className="ml-2 font-normal text-muted">{m.referenceNo}</span>}
                      </p>
                      <p className={cn('tabular text-sm font-bold', up ? 'text-success-700 dark:text-emerald-300' : 'text-danger-700 dark:text-red-300')}>
                        {up ? '+' : ''}{num(m.quantity)} {unit}
                      </p>
                    </div>
                    <p className="tabular text-xs text-muted">
                      {fmtDateTime(m.createdAt)} · balance {num(m.balanceAfter)} · @ {peso(m.unitCost)}{m.notes ? ` · ${m.notes}` : ''}
                    </p>
                  </motion.li>
                )
              })}
            </ol>
          </div>
          {moves && <Pagination page={moves} onPageChange={setPage} />}
        </Card>
      </div>
      <ProductFormDrawer open={editing} product={p} onClose={() => setEditing(false)} />
    </>
  )
}
