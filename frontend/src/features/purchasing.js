import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { del, get, post, put } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)))

// Suppliers
export const useSuppliers = (params) =>
  useQuery({ queryKey: ['suppliers', clean(params)], queryFn: () => get('/suppliers', clean(params)), placeholderData: keepPreviousData })

export const useAllSuppliers = () =>
  useQuery({ queryKey: ['suppliers', 'all'], queryFn: () => get('/suppliers', { size: 200 }).then((p) => p.content), staleTime: 60_000 })

export const useSaveSupplier = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/suppliers/${id}`, body) : post('/suppliers', body)), {
    success: 'Supplier saved', invalidate: [['suppliers']],
  })

export const useArchiveSupplier = () =>
  useApiMutation(({ id, archived }) => (archived ? del(`/suppliers/${id}`) : post(`/suppliers/${id}/restore`)), {
    success: (_, v) => (v.archived ? 'Supplier archived' : 'Supplier restored'), invalidate: [['suppliers']],
  })

// Purchase orders
const poKeys = [['purchase-orders'], ['purchase-order'], ['po-summary'], ['po-suggestions'], ['products'], ['product'], ['stock-movements'], ['notifications'], ['dashboard']]

export const usePurchaseOrders = (params) =>
  useQuery({ queryKey: ['purchase-orders', clean(params)], queryFn: () => get('/purchase-orders', clean(params)), placeholderData: keepPreviousData })

export const usePoSummary = (params) =>
  useQuery({ queryKey: ['po-summary', clean(params)], queryFn: () => get('/purchase-orders/summary', clean(params)) })

export const usePurchaseOrder = (id) => useQuery({ queryKey: ['purchase-order', id], queryFn: () => get(`/purchase-orders/${id}`), enabled: !!id })

export const useReorderSuggestions = () => useQuery({ queryKey: ['po-suggestions'], queryFn: () => get('/purchase-orders/suggestions') })

export const useSavePo = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/purchase-orders/${id}`, body) : post('/purchase-orders', body)), {
    success: (d) => `${d.poNumber} saved`, invalidate: poKeys,
  })

export const usePoAction = () =>
  useApiMutation(({ id, action, body }) => post(`/purchase-orders/${id}/${action}`, body), {
    success: (d, v) => ({ order: `${d.poNumber} marked as ordered`, receive: `Stock received on ${d.poNumber}`, cancel: `${d.poNumber} updated`, payments: 'Payment recorded' }[v.action]),
    invalidate: poKeys,
  })

export const useCreateFromSuggestions = () =>
  useApiMutation((items) => post('/purchase-orders/suggestions', { items }), {
    success: (d) => `Created ${d.length} draft PO${d.length === 1 ? '' : 's'}`, invalidate: poKeys,
  })
