import { keepPreviousData, useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { del, get, patch, post, put } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)))
const keys = [['jobs'], ['job'], ['job-board'], ['dashboard'], ['notifications'], ['products'], ['sales'], ['stock-movements']]

export const useJobs = (params) =>
  useQuery({ queryKey: ['jobs', clean(params)], queryFn: () => get('/job-orders', clean(params)), placeholderData: keepPreviousData })

export const useJobBoard = () => useQuery({ queryKey: ['job-board'], queryFn: () => get('/job-orders/board'), refetchInterval: 60_000 })

export const useJob = (id) => useQuery({ queryKey: ['job', id], queryFn: () => get(`/job-orders/${id}`), enabled: !!id })

export const useSaveJob = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/job-orders/${id}`, body) : post('/job-orders', body)), {
    success: (d, v) => (v.id ? `${d.jobNumber} saved` : `${d.jobNumber} created`), invalidate: keys,
  })

/** Kanban move with optimistic update; rolls back if the server rejects the transition. */
export function useMoveJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, position }) => patch(`/job-orders/${id}/status`, { status, position }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['job-board'] })
      const prev = qc.getQueryData(['job-board'])
      if (prev) {
        const next = Object.fromEntries(Object.entries(prev).map(([k, list]) => [k, list.filter((j) => j.id !== id)]))
        const moved = Object.values(prev).flat().find((j) => j.id === id)
        if (moved) next[status] = [{ ...moved, status }, ...(next[status] || [])]
        qc.setQueryData(['job-board'], next)
      }
      return { prev }
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['job-board'], ctx.prev)
      toast.error(err.message)
    },
    onSuccess: (d) => toast.success(`${d.jobNumber} moved to ${d.status.replace(/_/g, ' ').toLowerCase()}`),
    onSettled: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}

export const useJobAction = () =>
  useApiMutation(({ id, action, body }) => post(`/job-orders/${id}/${action}`, body), {
    success: (d, v) => ({
      'mark-printed': `${d.jobNumber} printed — materials deducted`,
      payments: 'Payment recorded',
      claim: `${d.jobNumber} claimed`,
      cancel: `${d.jobNumber} cancelled`,
      files: 'File attached',
    }[v.action]),
    invalidate: keys,
  })

export const useDeleteJobFile = () =>
  useApiMutation(({ id, fileId }) => del(`/job-orders/${id}/files/${fileId}`), { success: 'File removed', invalidate: [['job']] })
