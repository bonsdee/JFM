import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { del, get, post, put } from '@/lib/api'
import { useApiMutation } from './mutation'

export const useServices = (archived = false) =>
  useQuery({ queryKey: ['services', archived], queryFn: () => get('/services', { archived }), staleTime: 30_000 })

export const useService = (id) => useQuery({ queryKey: ['service', id], queryFn: () => get(`/services/${id}`), enabled: !!id })

export const useSaveService = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/services/${id}`, body) : post('/services', body)), {
    success: 'Service saved', invalidate: [['services'], ['service'], ['public-site']],
  })

/** Rebuilds a full save payload from a service as the API returns it, with optional overrides. */
export const toServicePayload = (s, patch = {}) => ({
  id: s.id, name: s.name, slug: s.slug || null, categoryId: s.categoryId || null, description: s.description || null,
  pricingModel: s.pricingModel, basePrice: s.basePrice ?? 0, rate: s.rate ?? 0, colorRate: s.colorRate ?? 0,
  longSurcharge: s.longSurcharge ?? 0, minCharge: s.minCharge ?? 0, piecesPerBatch: s.piecesPerBatch || 1,
  rushFeePercent: s.rushFeePercent ?? 0, unitLabel: s.unitLabel || null, icon: s.icon || null,
  showOnWebsite: s.showOnWebsite, active: s.active, sortOrder: s.sortOrder ?? 0,
  materials: (s.materials || []).map((m) => ({ productId: m.productId, qtyPerUnit: m.qtyPerUnit, notes: m.notes || null })),
  addons: (s.addons || []).map((a) => ({ id: a.id || null, name: a.name, chargeType: a.chargeType, amount: a.amount ?? 0, active: a.active !== false })),
  ...patch,
})

/** Website tab: show/hide a service or save a new order. Takes [{ service, patch }] and saves them one by one. */
export const useUpdateWebsiteServices = () =>
  useApiMutation(async (changes) => {
    for (const { service, patch } of changes) await put(`/services/${service.id}`, toServicePayload(service, patch))
  }, { success: 'Website updated', invalidate: [['services'], ['service'], ['public-site']] })

export const useArchiveService = () =>
  useApiMutation(({ id, archived }) => (archived ? del(`/services/${id}`) : post(`/services/${id}/restore`)), {
    success: (_, v) => (v.archived ? 'Service archived' : 'Service restored'), invalidate: [['services']],
  })

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

/** Live server-side quote (owner): same engine as landing/POS/jobs. */
export function useQuote(request, enabled = true) {
  const debounced = useDebounced(request)
  return useQuery({
    queryKey: ['quote', debounced],
    queryFn: () => post('/services/quote', debounced),
    enabled: enabled && !!debounced?.serviceId,
    placeholderData: keepPreviousData,
    retry: false,
  })
}
