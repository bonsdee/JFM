import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null))
const keys = [['stock-movements'], ['products'], ['product'], ['product-movements'], ['product-options'], ['dashboard'], ['notifications']]

export const useStockMovements = (params) =>
  useQuery({ queryKey: ['stock-movements', clean(params)], queryFn: () => get('/stock/movements', clean(params)), placeholderData: keepPreviousData })

export const useStockIn = () => useApiMutation((body) => post('/stock/in', body), { success: (d) => `Stock in posted for ${d.length} item(s)`, invalidate: keys })

export const useStockOut = () => useApiMutation((body) => post('/stock/out', body), { success: (d) => `Stock out posted for ${d.length} item(s)`, invalidate: keys })

export const usePhysicalCount = () =>
  useApiMutation((body) => post('/stock/count', body), {
    success: (d) => `${d.filter((l) => l.posted).length} adjustment(s) posted`,
    invalidate: keys,
  })

export const useReconciliation = () => useQuery({ queryKey: ['stock-reconciliation'], queryFn: () => get('/stock/reconciliation') })
