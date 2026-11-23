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
