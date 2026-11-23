import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

/**
 * useMutation + toast on every mutation + cache invalidation.
 * @param fn async (vars) => data
 * @param opts { success: string | (data, vars) => string, invalidate: queryKey[], onSuccess, silent }
 */
export function useApiMutation(fn, { success, invalidate = [], onSuccess, onError, silent } = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data, vars, ctx) => {
      await Promise.all(invalidate.map((key) => qc.invalidateQueries({ queryKey: key })))
      if (!silent && success) toast.success(typeof success === 'function' ? success(data, vars) : success)
      onSuccess?.(data, vars, ctx)
    },
    onError: (err, vars, ctx) => {
      toast.error(err?.message || 'Something went wrong')
      onError?.(err, vars, ctx)
    },
  })
}

/** Copies server field errors onto react-hook-form fields. */
export function applyFieldErrors(err, setError) {
  for (const fe of err?.fieldErrors || []) setError(fe.field, { type: 'server', message: fe.message })
}
