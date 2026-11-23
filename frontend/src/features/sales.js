import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null))
const keys = [['sales'], ['sale'], ['products'], ['product'], ['product-options'], ['stock-movements'], ['dashboard'], ['notifications'], ['jobs'], ['job'], ['customer']]

export const useSales = (params) =>
  useQuery({ queryKey: ['sales', clean(params)], queryFn: () => get('/sales', clean(params)), placeholderData: keepPreviousData })

export const useSale = (id) => useQuery({ queryKey: ['sale', id], queryFn: () => get(`/sales/${id}`), enabled: !!id })

export const useCheckout = () => useApiMutation((body) => post('/sales', body), { success: (d) => `${d.saleNumber} completed`, invalidate: keys })

export const useVoidSale = () =>
  useApiMutation(({ id, reason }) => post(`/sales/${id}/void`, { reason }), { success: (d) => `${d.saleNumber} voided — stock restored`, invalidate: keys })
