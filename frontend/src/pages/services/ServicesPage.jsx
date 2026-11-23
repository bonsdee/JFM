import { useEffect, useState } from 'react'
import { Archive, Eye, EyeOff, Layers, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Drawer, EmptyState, Field, Input, PageHeader, Select, Skeleton, Tabs, Textarea, Toggle } from '@/components/ui'
import { ProductPicker } from '@/components/shared/Pickers'
import { iconFor } from '@/components/landing/serviceIcons'
import { useArchiveService, useSaveService, useServices } from '@/features/services'
import { useCategories } from '@/features/products'
import { ADDON_TYPES, PRICING_MODELS, SERVICE_ICONS, UNIT_LABEL } from '@/lib/constants'
import { num, peso } from '@/lib/format'

function priceSummary(s) {
  switch (s.pricingModel) {
    case 'FIXED': return `${peso(s.basePrice)} ${s.unitLabel || 'per package'}`
    case 'PER_SQFT': return `${peso(s.rate)} / sq ft · min ${peso(s.minCharge)}`
    case 'PER_PIECE': return `${peso(s.rate)} per ${s.piecesPerBatch > 1 ? `${s.piecesPerBatch} pcs` : 'piece'}`
    case 'PER_PAGE': return `${peso(s.rate)} B&W · ${peso(s.colorRate)} color`
    default: return ''
  }
}

export default function ServicesPage() {
  const [tab, setTab] = useState('active')
  const { data, isLoading } = useServices(tab === 'archived')
  const archive = useArchiveService()
  const [editing, setEditing] = useState(null)

  return (
    <>
      <PageHeader title="Services" subtitle="Pricing models, add-ons and the materials each service consumes." actions={<Button icon={Plus} onClick={() => setEditing({})}>Add service</Button>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
      {isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-card" />)}</div>}
      {data && !data.length && <Card><EmptyState icon={Layers} title="No services here" action={tab === 'active' && <Button icon={Plus} onClick={() => setEditing({})}>Add service</Button>} /></Card>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((s) => {
          const Icon = iconFor(s.icon)
          return (
            <Card key={s.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary dark:bg-primary/15"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-muted">{s.code} · {PRICING_MODELS[s.pricingModel].label}</p>
                </div>
                {!s.active && <Badge>Inactive</Badge>}
                {s.showOnWebsite ? <Eye className="h-4 w-4 text-muted" aria-label="Shown on website" /> : <EyeOff className="h-4 w-4 text-muted" aria-label="Hidden from website" />}
              </div>
              <p className="tabular mt-4 font-display text-lg font-extrabold">{priceSummary(s)}</p>
              {Number(s.rushFeePercent) > 0 && <p className="text-xs text-muted">Rush +{num(s.rushFeePercent)}%</p>}
              <div className="mt-4 flex-1 space-y-1.5 text-xs">
                {s.materials.length > 0 && <p className="text-muted">Uses: {s.materials.map((m) => `${m.productName} (${num(m.qtyPerUnit)} ${UNIT_LABEL[m.unit]})`).join(', ')}</p>}
                {s.addons.length > 0 && <p className="text-muted">Add-ons: {s.addons.map((a) => a.name).join(', ')}</p>}
              </div>
              <div className="mt-4 flex gap-2 border-t border-line/70 pt-4">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(s)}>Edit</Button>
                <Button size="sm" variant="ghost" icon={s.archived ? RotateCcw : Archive} onClick={() => archive.mutate({ id: s.id, archived: !s.archived })}>{s.archived ? 'Restore' : 'Archive'}</Button>
              </div>
            </Card>
          )
        })}
      </div>
      <ServiceDrawer service={editing} onClose={() => setEditing(null)} />
    </>
  )
}

const blank = {
  name: '', slug: '', categoryId: '', description: '', pricingModel: 'PER_SQFT', basePrice: 0, rate: 0, colorRate: 0, longSurcharge: 0, minCharge: 0,
  piecesPerBatch: 1, rushFeePercent: 0, unitLabel: '', icon: 'Printer', showOnWebsite: true, active: true, sortOrder: 0, materials: [], addons: [],
}

function ServiceDrawer({ service, onClose }) {
  const save = useSaveService()
  const { data: categories } = useCategories('SERVICE')
  const [f, setF] = useState(blank)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!service) return
    setErr('')
    setF(service.id ? {
      ...blank, ...service, categoryId: service.categoryId || '',
      materials: service.materials.map((m) => ({ productId: m.productId, label: `${m.productName} (${m.sku})`, unit: m.unit, qtyPerUnit: m.qtyPerUnit, notes: m.notes || '' })),
      addons: service.addons.map((a) => ({ ...a })),
    } : blank)
  }, [service])

  const set = (patch) => setF((p) => ({ ...p, ...patch }))
  const m = f.pricingModel
  const unitWord = m === 'PER_SQFT' ? 'sq ft' : m === 'PER_PAGE' ? 'page' : m === 'PER_PIECE' ? 'piece' : 'package'

  const submit = () => {
    if (!f.name.trim()) return setErr('Name is required')
    setErr('')
    const n = (v) => (v === '' || v === null ? 0 : Number(v))
    save.mutate({
      id: service.id, ...f, categoryId: f.categoryId || null, slug: f.slug || null,
      basePrice: n(f.basePrice), rate: n(f.rate), colorRate: n(f.colorRate), longSurcharge: n(f.longSurcharge), minCharge: n(f.minCharge),
      piecesPerBatch: Math.max(1, n(f.piecesPerBatch)), rushFeePercent: n(f.rushFeePercent), sortOrder: n(f.sortOrder),
      materials: f.materials.filter((x) => x.productId && Number(x.qtyPerUnit) > 0).map((x) => ({ productId: x.productId, qtyPerUnit: Number(x.qtyPerUnit), notes: x.notes || null })),
      addons: f.addons.filter((a) => a.name.trim()).map((a) => ({ id: a.id || null, name: a.name, chargeType: a.chargeType, amount: n(a.amount), active: a.active !== false })),
    }, { onSuccess: onClose })
  }

  return (
    <Drawer open={!!service} onClose={onClose} width="max-w-2xl" title={service?.id ? `Edit ${service.name}` : 'Add service'}
      description="Prices are calculated by one shared engine for the website, POS and job orders."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save service</Button></>}>
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} invalid={!!err} /></Field>
          <Field label="Category"><Select value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })} placeholder="None">{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Icon"><Select value={f.icon} onChange={(e) => set({ icon: e.target.value })}>{SERVICE_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}</Select></Field>
          <Field label="Description" className="sm:col-span-2" hint="Shown on the website service card"><Textarea rows={2} value={f.description || ''} onChange={(e) => set({ description: e.target.value })} /></Field>
        </section>

        <section className="space-y-4 rounded-2xl border border-line/70 p-4">
          <p className="font-semibold">Pricing</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(PRICING_MODELS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => set({ pricingModel: k })}
                className={`rounded-2xl border p-3 text-left transition ${m === k ? 'border-primary bg-primary-50/60 ring-4 ring-primary/10 dark:bg-primary/10' : 'border-line hover:bg-subtle'}`}>
                <span className="block text-sm font-semibold">{v.label}</span><span className="block text-xs text-muted">{v.hint}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {m === 'FIXED' && <Field label="Package price"><Input type="number" step="0.01" prefix="₱" value={f.basePrice} onChange={(e) => set({ basePrice: e.target.value })} /></Field>}
            {m === 'PER_SQFT' && <Field label="Rate per sq ft"><Input type="number" step="0.01" prefix="₱" value={f.rate} onChange={(e) => set({ rate: e.target.value })} /></Field>}
            {m === 'PER_PIECE' && <>
              <Field label="Rate per batch"><Input type="number" step="0.01" prefix="₱" value={f.rate} onChange={(e) => set({ rate: e.target.value })} /></Field>
              <Field label="Pieces per batch" hint="e.g. 100 for business cards"><Input type="number" min="1" value={f.piecesPerBatch} onChange={(e) => set({ piecesPerBatch: e.target.value })} /></Field>
            </>}
            {m === 'PER_PAGE' && <>
              <Field label="B&W per page"><Input type="number" step="0.01" prefix="₱" value={f.rate} onChange={(e) => set({ rate: e.target.value })} /></Field>
              <Field label="Colored per page"><Input type="number" step="0.01" prefix="₱" value={f.colorRate} onChange={(e) => set({ colorRate: e.target.value })} /></Field>
              <Field label="Long paper surcharge"><Input type="number" step="0.01" prefix="₱" value={f.longSurcharge} onChange={(e) => set({ longSurcharge: e.target.value })} /></Field>
            </>}
            {m !== 'FIXED' && <Field label={m === 'PER_SQFT' ? 'Minimum per piece' : 'Minimum charge'}><Input type="number" step="0.01" prefix="₱" value={f.minCharge} onChange={(e) => set({ minCharge: e.target.value })} /></Field>}
            <Field label="Rush fee"><Input type="number" step="0.01" suffix="%" value={f.rushFeePercent} onChange={(e) => set({ rushFeePercent: e.target.value })} /></Field>
            <Field label="Unit label" hint="Shown after price"><Input placeholder={`per ${unitWord}`} value={f.unitLabel || ''} onChange={(e) => set({ unitLabel: e.target.value })} /></Field>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-line/70 p-4">
          <div className="flex items-center justify-between"><p className="font-semibold">Add-ons</p><Button size="xs" variant="soft" icon={Plus} onClick={() => set({ addons: [...f.addons, { name: '', chargeType: 'FIXED', amount: 0, active: true }] })}>Add</Button></div>
          {!f.addons.length && <p className="text-sm text-muted">e.g. eyelets, layout fee, lamination.</p>}
          {f.addons.map((a, i) => {
            const upd = (patch) => set({ addons: f.addons.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
            return (
              <div key={a.id || i} className="grid items-center gap-2 sm:grid-cols-[1fr_170px_110px_auto_36px]">
                <Input placeholder="Add-on name" value={a.name} onChange={(e) => upd({ name: e.target.value })} aria-label="Add-on name" />
                <Select value={a.chargeType} onChange={(e) => upd({ chargeType: e.target.value })} aria-label="Charge type">{Object.entries(ADDON_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                <Input type="number" step="0.01" value={a.amount} onChange={(e) => upd({ amount: e.target.value })} suffix={a.chargeType === 'PERCENT' ? '%' : '₱'} aria-label="Amount" />
                <Toggle checked={a.active !== false} onChange={(v) => upd({ active: v })} />
                <Button variant="ghost" size="icon-sm" onClick={() => set({ addons: f.addons.filter((_, j) => j !== i) })} aria-label="Remove add-on"><Trash2 className="h-4 w-4" /></Button>
              </div>
            )
          })}
        </section>

        <section className="space-y-3 rounded-2xl border border-line/70 p-4">
          <div className="flex items-center justify-between">
            <div><p className="font-semibold">Bill of materials</p><p className="text-xs text-muted">Deducted when a job is marked printed or a POS sale is completed. Quantity is per {unitWord}.</p></div>
            <Button size="xs" variant="soft" icon={Plus} onClick={() => set({ materials: [...f.materials, { productId: null, label: '', qtyPerUnit: 1, notes: '' }] })}>Add</Button>
          </div>
          {f.materials.map((x, i) => {
            const upd = (patch) => set({ materials: f.materials.map((y, j) => (j === i ? { ...y, ...patch } : y)) })
            return (
              <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_140px_36px]">
                <ProductPicker material value={x.productId} initialLabel={x.label} placeholder="Search materials…" onChange={(p) => upd({ productId: p.id, label: `${p.name} (${p.sku})`, unit: p.unit })} />
                <Input type="number" step="0.001" value={x.qtyPerUnit} onChange={(e) => upd({ qtyPerUnit: e.target.value })} suffix={x.unit ? UNIT_LABEL[x.unit] : ''} aria-label="Quantity per unit" />
                <Button variant="ghost" size="icon-sm" onClick={() => set({ materials: f.materials.filter((_, j) => j !== i) })} aria-label="Remove material"><Trash2 className="h-4 w-4" /></Button>
              </div>
            )
          })}
        </section>

        <section className="space-y-3">
          <Toggle checked={f.showOnWebsite} onChange={(v) => set({ showOnWebsite: v })} label="Show on website" description="Appears in the landing page services grid" />
          <Toggle checked={f.active} onChange={(v) => set({ active: v })} label="Active" description="Inactive services can't be sold or quoted" />
        </section>
        {err && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}
      </div>
    </Drawer>
  )
}
