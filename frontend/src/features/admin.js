import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { get, patch, post, put } from '@/lib/api'
import { useApiMutation } from './mutation'

const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)))

// Dashboard & reports
export const useDashboard = (range) => useQuery({ queryKey: ['dashboard', range], queryFn: () => get('/dashboard', { range }), staleTime: 30_000 })

export const useReport = (type, params) =>
  useQuery({ queryKey: ['reports', type, clean(params)], queryFn: () => get(`/reports/${type}`, clean(params)), placeholderData: keepPreviousData })

// Settings & website content
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => get('/settings'), staleTime: 60_000 })
export const useSaveSettings = () => useApiMutation((body) => put('/settings', body), { success: 'Settings saved', invalidate: [['settings'], ['public-site']] })

export const useSiteContent = () => useQuery({ queryKey: ['site-content'], queryFn: () => get('/site-content') })
export const useSaveContent = () =>
  useApiMutation(({ key, content }) => put(`/site-content/${key}`, { content }), { success: 'Website updated', invalidate: [['site-content'], ['public-site']] })

// Notifications
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: () => get('/notifications'), refetchInterval: 120_000 })
export const useMarkNotification = () =>
  useApiMutation((id) => (id ? post(`/notifications/${id}/read`) : post('/notifications/read-all')), { silent: true, invalidate: [['notifications']] })

// Inquiries
export const useInquiries = (params) =>
  useQuery({ queryKey: ['inquiries', clean(params)], queryFn: () => get('/inquiries', clean(params)), placeholderData: keepPreviousData })
export const useSetInquiryStatus = () =>
  useApiMutation(({ id, status }) => patch(`/inquiries/${id}/status`, { status }), {
    success: (_, v) => `Marked as ${v.status.toLowerCase()}`, invalidate: [['inquiries'], ['notifications']],
  })

// Audit
export const useAuditLogs = (params) =>
  useQuery({ queryKey: ['audit', clean(params)], queryFn: () => get('/audit-logs', clean(params)), placeholderData: keepPreviousData })
