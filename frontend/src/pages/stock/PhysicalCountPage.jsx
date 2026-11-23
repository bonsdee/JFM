import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Button, Card, Input, Modal, PageHeader, SearchInput, Tabs, Badge } from '@/components/ui'
import { useProducts } from '@/features/products'
import { usePhysicalCount } from '@/features/stock'
import { UNIT_LABEL } from '@/lib/constants'
import { num } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Enter actual counts; the system posts PHYSICAL_COUNT adjustments for every difference. */
export default function PhysicalCountPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('all')
  const [counts, setCounts] = useState({})
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState(null)
  const { data, isLoading } = useProducts({ q, size: 200, sort: 'name,asc', material: tab === 'all' ? undefined : tab === 'materials' })
  const count = usePhysicalCount()

  const entered = useMemo(() => Object.entries(counts).filter(([, v]) => v !== ''), [counts])
  const byId = Object.fromEntries((data?.content || []).map((p) => [p.id, p]))
  const diffs = entered.filter(([id, v]) => byId[id] && Number(v) !== Number(byId[id].stockOnHand)).length

  const submit = () =>
    count.mutate({ notes: notes || null, items: entered.map(([productId, v]) => ({ productId, countedQuantity: Number(v) })) }, { onSuccess: setResult })

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Stock ledger', to: '/app/stock' }, { label: 'Physical count' }]}
        title="Physical count"
        subtitle="Count what's on the shelf. Only items you enter are adjusted."
        actions={<Button disabled={!entered.length} loading={count.isPending} onClick={submit}>Post {entered.length} count{entered.length === 1 ? '' : 's'}{diffs ? ` · ${diffs} change${diffs === 1 ? '' : 's'}` : ''}</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All items' }, { value: 'retail', label: 'Retail' }, { value: 'materials', label: 'Materials' }]} />
        <div className="flex gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Find an item" className="w-60" />
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Count note (e.g. Nov month-end)" className="w-64" />
        </div>
      </div>
      <Card className="divide-y divide-line/60">
        {isLoading && <p className="p-6 text-sm text-muted">Loading items…</p>}
        {data?.content.map((p) => {
          const v = counts[p.id] ?? ''
          const diff = v === '' ? null : Number(v) - Number(p.stockOnHand)
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{p.sku} · {p.location || 'no location'}</p>
              </div>
              <div className="tabular w-32 text-right text-sm text-muted">System: <span className="font-semibold text-ink">{num(p.stockOnHand)}</span> {UNIT_LABEL[p.unit]}</div>
              <Input type="number" min="0" step="0.001" value={v} placeholder="Counted" className="w-32" aria-label={`Counted quantity for ${p.name}`}
                onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))} />
              <span className={cn('tabular w-20 text-right text-sm font-bold', diff > 0 && 'text-success-700', diff < 0 && 'text-danger-700', diff === 0 && 'text-muted')}>
                {diff === null ? '' : diff === 0 ? 'match' : `${diff > 0 ? '+' : ''}${num(diff)}`}
              </span>
            </div>
          )
        })}
      </Card>

      <Modal open={!!result} onClose={() => navigate('/app/stock')} title="Count posted" size="md"
        footer={<Button onClick={() => navigate('/app/stock')}>View ledger</Button>}>
        <ul className="space-y-2 text-sm">
          {result?.map((l) => (
            <li key={l.productId} className="flex items-center justify-between gap-3">
              <span>{l.name}</span>
              {l.posted ? <Badge tone={l.difference > 0 ? 'success' : 'danger'}>{l.difference > 0 ? '+' : ''}{num(l.difference)}</Badge> : <span className="flex items-center gap-1 text-muted"><CheckCircle2 className="h-4 w-4" /> matched</span>}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
