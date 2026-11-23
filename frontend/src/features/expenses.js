import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { del, get, post, put } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null))
const keys = [['expenses'], ['expense-categories'], ['reports'], ['dashboard']]

export const useExpenses = (params) =>
  useQuery({ queryKey: ['expenses', clean(params)], queryFn: () => get('/expenses', clean(params)), placeholderData: keepPreviousData })

export const useExpenseCategories = () => useQuery({ queryKey: ['expense-categories'], queryFn: () => get('/expense-categories'), staleTime: 60_000 })

export const useSaveExpense = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/expenses/${id}`, body) : post('/expenses', body)), { success: 'Expense saved', invalidate: keys })

export const useDeleteExpense = () => useApiMutation((id) => del(`/expenses/${id}`), { success: 'Expense deleted', invalidate: keys })

export const useSaveExpenseCategory = () =>
  useApiMutation(({ id, ...body }) => (id ? put(`/expense-categories/${id}`, body) : post('/expense-categories', body)), { success: 'Category saved', invalidate: keys })

export const useDeleteExpenseCategory = () => useApiMutation((id) => del(`/expense-categories/${id}`), { success: 'Category deleted', invalidate: keys })
