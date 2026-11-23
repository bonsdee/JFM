import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, del, get, post, put } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null))

export const useProducts = (params) =>
  useQuery({ queryKey: ['products', clean(params)], queryFn: () => get('/products', clean(params)), placeholderData: keepPreviousData })

export const useProduct = (id) => useQuery({ queryKey: ['product', id], queryFn: () => get(`/products/${id}`), enabled: !!id })

export const useProductOptions = (q, material, enabled = true) =>
  useQuery({
    queryKey: ['product-options', q, material],
    queryFn: () => get('/products/options', clean({ q, material, limit: 20 })),
    enabled,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })

export const useLowStock = () => useQuery({ queryKey: ['products', 'low-stock'], queryFn: () => get('/products/low-stock') })

export const useProductMovements = (id, page = 0) =>
  useQuery({ queryKey: ['product-movements', id, page], queryFn: () => get(`/products/${id}/movements`, { page, size: 30 }), enabled: !!id })

const productKeys = [['products'], ['product'], ['product-options'], ['dashboard']]

export const useSaveProduct = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/products/${id}`, body) : post('/products', body)), {
    success: (_, v) => (v.id ? 'Product saved' : 'Product added'),
    invalidate: productKeys,
  })

export const useArchiveProduct = () =>
  useApiMutation(({ id, archived }) => (archived ? del(`/products/${id}`) : post(`/products/${id}/restore`)), {
    success: (_, v) => (v.archived ? 'Product archived' : 'Product restored'),
    invalidate: productKeys,
  })

export const useImportProducts = () =>
  useApiMutation(
    (file) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/products/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
    },
    { success: (d) => `Imported ${d.created} product(s)`, invalidate: productKeys },
  )

// Categories
export const useCategories = (kind) =>
  useQuery({ queryKey: ['categories', kind || 'all'], queryFn: () => get('/categories', clean({ kind })), staleTime: 60_000 })

export const useSaveCategory = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/categories/${id}`, body) : post('/categories', body)), {
    success: 'Category saved',
    invalidate: [['categories']],
  })

export const useDeleteCategory = () =>
  useApiMutation((id) => del(`/categories/${id}`), { success: 'Category deleted', invalidate: [['categories']] })
