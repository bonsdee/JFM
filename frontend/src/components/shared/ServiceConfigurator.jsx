import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useQuote } from '@/features/services'
import { Field, Input, Segmented, Select, Toggle } from '@/components/ui/Form'
import { ADDON_TYPES } from '@/lib/constants'
import { num, peso } from '@/lib/format'

/** Builds the QuoteRequest body for a service from local form state. */
export function buildQuote(service, s) {
  if (!service) return null
  return {
    serviceId: service.id,
    quantity: Number(s.quantity) || 1,
    widthFt: service.pricingModel === 'PER_SQFT' ? Number(s.widthFt) || 0 : undefined,
    heightFt: service.pricingModel === 'PER_SQFT' ? Number(s.heightFt) || 0 : undefined,
    pages: service.pricingModel === 'PER_PAGE' ? Number(s.pages) || 0 : undefined,
    colored: service.pricingModel === 'PER_PAGE' ? !!s.colored : false,
    paperSize: service.pricingModel === 'PER_PAGE' ? s.paperSize : undefined,
    rush: !!s.rush,
    addons: Object.entries(s.addons || {}).filter(([, v]) => v.on).map(([id, v]) => ({ addonId: id, quantity: v.qty ? Number(v.qty) : undefined })),
    notes: s.notes || undefined,
  }
}

export const defaultSpecs = { quantity: 1, widthFt: 3, heightFt: 5, pages: 1, colored: false, paperSize: 'SHORT', rush: false, addons: {}, notes: '' }

/**
 * Service pricing calculator used by POS and job orders. Every keystroke is priced by the backend
 * (/services/quote) so the number shown here is exactly what gets saved. Material availability
 * from the bill of materials is shown underneath.
 */
export function ServiceConfigurator({ services, initialServiceId, initialSpecs, onChange }) {
  const [serviceId, setServiceId] = useState(initialServiceId || services?.[0]?.id || '')
  const [s, setS] = useState({ ...defaultSpecs, ...(initialSpecs || {}) })
  const service = services?.find((x) => x.id === serviceId)
  const request = useMemo(() => buildQuote(service, s), [service, s])
  const { data: quote, isFetching, error } = useQuote(request, !!service)

  // Keep the latest callback in a ref so parents don't need useCallback (avoids render loops).
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => { onChangeRef.current?.({ service, request, quote: error ? null : quote, error }) }, [service, request, quote, error])

  const set = (patch) => setS((prev) => ({ ...prev, ...patch }))
  const setAddon = (id, patch) => setS((prev) => ({ ...prev, addons: { ...prev.addons, [id]: { ...(prev.addons[id] || {}), ...patch } } }))

  if (!services?.length) return <p className="text-sm text-muted">No active services. Add one under Services.</p>
  const model = service?.pricingModel

  return (
    <div className="space-y-4">
      <Field label="Service" htmlFor="svc">
        <Select id="svc" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setS({ ...defaultSpecs }) }}>
          {services.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
      </Field>

      {model === 'PER_SQFT' && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Width (ft)" htmlFor="w"><Input id="w" type="number" min="0.5" step="0.5" value={s.widthFt} onChange={(e) => set({ widthFt: e.target.value })} /></Field>
          <Field label="Height (ft)" htmlFor="h"><Input id="h" type="number" min="0.5" step="0.5" value={s.heightFt} onChange={(e) => set({ heightFt: e.target.value })} /></Field>
          <Field label="Quantity" htmlFor="q"><Input id="q" type="number" min="1" value={s.quantity} onChange={(e) => set({ quantity: e.target.value })} /></Field>
        </div>
      )}
      {model === 'PER_PAGE' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pages" htmlFor="pg"><Input id="pg" type="number" min="1" value={s.pages} onChange={(e) => set({ pages: e.target.value })} /></Field>
            <Field label="Copies" htmlFor="cp"><Input id="cp" type="number" min="1" value={s.quantity} onChange={(e) => set({ quantity: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Segmented value={s.colored ? 'color' : 'bw'} onChange={(v) => set({ colored: v === 'color' })} options={[{ value: 'bw', label: 'B&W' }, { value: 'color', label: 'Colored' }]} />
            <Segmented value={s.paperSize} onChange={(v) => set({ paperSize: v })} options={[{ value: 'SHORT', label: 'Short' }, { value: 'A4', label: 'A4' }, { value: 'LONG', label: 'Long' }]} />
          </div>
        </>
      )}
      {(model === 'PER_PIECE' || model === 'FIXED') && (
        <Field label={model === 'FIXED' ? 'Packages' : `Quantity (pcs)${service.piecesPerBatch > 1 ? ` — priced per ${service.piecesPerBatch}` : ''}`} htmlFor="qp">
          <Input id="qp" type="number" min="1" value={s.quantity} onChange={(e) => set({ quantity: e.target.value })} />
        </Field>
      )}

      {service?.addons?.filter((a) => a.active).length > 0 && (
        <div className="space-y-2 rounded-2xl border border-line/70 p-3">
          <p className="text-xs font-semibold text-muted">Add-ons</p>
          {service.addons.filter((a) => a.active).map((a) => {
            const st = s.addons[a.id] || {}
            return (
              <div key={a.id} className="flex items-center gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={!!st.on} onChange={(e) => setAddon(a.id, { on: e.target.checked })} className="h-4 w-4 accent-[#6366F1]" />
                  <span className="flex-1">{a.name}</span>
                  <span className="tabular text-xs text-muted">{a.chargeType === 'PERCENT' ? `${num(a.amount)}%` : peso(a.amount)} · {ADDON_TYPES[a.chargeType]}</span>
                </label>
                {a.chargeType === 'PER_PIECE' && st.on && (
                  <Input type="number" min="1" placeholder="Qty" className="!h-8 w-20" value={st.qty || ''} onChange={(e) => setAddon(a.id, { qty: e.target.value })} aria-label={`${a.name} quantity`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {Number(service?.rushFeePercent) > 0 && (
        <Toggle checked={s.rush} onChange={(v) => set({ rush: v })} label="Rush order" description={`+${num(service.rushFeePercent)}% priority fee`} />
      )}
      <Field label="Specs / notes" htmlFor="sn"><Input id="sn" placeholder="e.g. matte finish, use logo from FB" value={s.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>

      <div className="rounded-2xl bg-subtle p-4">
        {error ? (
          <p className="flex items-center gap-2 text-sm font-medium text-danger"><AlertTriangle className="h-4 w-4" /> {error.message}</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted">{quote?.description || 'Calculating…'}</p>
                {quote?.minimumApplied && <p className="text-xs font-semibold text-warning-700 dark:text-amber-300">Minimum charge applied</p>}
              </div>
              <p className="tabular flex items-center gap-2 font-display text-2xl font-extrabold">
                {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
                {peso(quote?.total)}
              </p>
            </div>
            {quote?.rushFee > 0 && <p className="tabular mt-1 text-right text-xs text-muted">includes rush {peso(quote.rushFee)}</p>}
            {quote?.materials?.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
                {quote.materials.map((m) => (
                  <li key={m.productId} className="flex justify-between gap-2">
                    <span className="truncate text-muted">{m.name}</span>
                    <span className={m.sufficient ? 'tabular text-muted' : 'tabular font-semibold text-danger'}>
                      {num(m.quantity)} {m.unit.toLowerCase()} {m.sufficient ? '' : `(only ${num(m.onHand)})`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
