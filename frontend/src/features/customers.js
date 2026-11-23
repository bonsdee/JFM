import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { del, get, post, put } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null))

export const useCustomers = (params, enabled = true) =>
  useQuery({ queryKey: ['customers', clean(params)], queryFn: () => get('/customers', clean(params)), placeholderData: keepPreviousData, enabled })

export const useCustomer = (id) => useQuery({ queryKey: ['customer', id], queryFn: () => get(`/customers/${id}`), enabled: !!id })

export const useSaveCustomer = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/customers/${id}`, body) : post('/customers', body)), {
    success: 'Customer saved', invalidate: [['customers'], ['customer']],
  })

export const useArchiveCustomer = () =>
  useApiMutation(({ id, archived }) => (archived ? del(`/customers/${id}`) : post(`/customers/${id}/restore`)), {
    success: (_, v) => (v.archived ? 'Customer archived' : 'Customer restored'), invalidate: [['customers'], ['customer']],
  })
