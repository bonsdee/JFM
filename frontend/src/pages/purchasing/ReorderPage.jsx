import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ClipboardPlus } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, Input, PageHeader, Skeleton } from '@/components/ui'
import { useCreateFromSuggestions, useReorderSuggestions } from '@/features/purchasing'
import { UNIT_LABEL } from '@/lib/constants'
import { num, peso } from '@/lib/format'

/** Items at/below reorder level (net of open POs), grouped by supplier. One click → draft POs. */
export default function ReorderPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useReorderSuggestions()
  const create = useCreateFromSuggestions()
  const [sel, setSel] = useState({})

  useEffect(() => {
    if (!data) return
    setSel(Object.fromEntries(data.flatMap((g) => g.items.map((i) => [i.productId, { on: !!g.supplierId, qty: i.suggestedQty, cost: i.lastCost, supplierId: g.supplierId }]))))
  }, [data])

  const chosen = Object.entries(sel).filter(([, v]) => v.on && v.supplierId && Number(v.qty) > 0)
  const submit = () => create.mutate(chosen.map(([productId, v]) => ({ productId, quantity: Number(v.qty), unitCost: Number(v.cost), supplierId: v.supplierId })),
    { onSuccess: (pos) => navigate(pos.length === 1 ? `/app/purchasing/orders/${pos[0].id}` : '/app/purchasing/orders') })

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Purchase orders', to: '/app/purchasing/orders' }, { label: 'Reorder suggestions' }]}
        title="Reorder suggestions"
        subtitle="Suggested quantity tops each item up to twice its reorder level, minus what's already on order."
        actions={<Button icon={ClipboardPlus} disabled={!chosen.length} loading={create.isPending} onClick={submit}>Create draft PO{chosen.length ? `s for ${chosen.length} item${chosen.length > 1 ? 's' : ''}` : ''}</Button>}
      />
      {isLoading && <Skeleton className="h-72 rounded-card" />}
      {data && !data.length && <Card><EmptyState icon={CheckCircle2} title="Nothing to reorder" message="Every item is above its reorder level or already on order." /></Card>}
      <div className="space-y-4">
        {data?.map((g) => (
          <Card key={g.supplierId || 'none'}>
            <CardHeader title={g.supplierName} subtitle={g.supplierId ? `Estimated ${peso(g.estimatedTotal)}` : 'Assign a supplier to these products to include them'} />
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="w-10 px-3 py-2" /><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">On hand</th><th className="px-3 py-2 text-right">Reorder at</th><th className="px-3 py-2 text-right">On order</th><th className="px-3 py-2">Order qty</th><th className="px-3 py-2">Unit cost</th></tr></thead>
                <tbody>
                  {g.items.map((i) => {
                    const s = sel[i.productId] || {}
                    const set = (patch) => setSel({ ...sel, [i.productId]: { ...s, ...patch } })
                    return (
                      <tr key={i.productId} className="border-t border-line/60">
                        <td className="px-3 py-2.5"><input type="checkbox" checked={!!s.on} disabled={!g.supplierId} onChange={(e) => set({ on: e.target.checked })} className="h-4 w-4 accent-[#6366F1]" aria-label={`Include ${i.name}`} /></td>
                        <td className="px-3 py-2.5"><p className="font-semibold">{i.name}</p><p className="text-xs text-muted">{i.sku}</p></td>
                        <td className={`tabular px-3 py-2.5 text-right ${i.stockOnHand <= 0 ? 'font-semibold text-danger' : ''}`}>{num(i.stockOnHand)} {UNIT_LABEL[i.unit]}</td>
                        <td className="tabular px-3 py-2.5 text-right text-muted">{num(i.reorderLevel)}</td>
                        <td className="tabular px-3 py-2.5 text-right text-muted">{num(i.onOrder)}</td>
                        <td className="px-3 py-2.5"><Input type="number" min="0" className="!h-9 w-28" value={s.qty ?? ''} onChange={(e) => set({ qty: e.target.value })} aria-label="Order quantity" /></td>
                        <td className="px-3 py-2.5"><Input type="number" min="0" step="0.01" prefix="₱" className="!h-9 w-32" value={s.cost ?? ''} onChange={(e) => set({ cost: e.target.value })} aria-label="Unit cost" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
