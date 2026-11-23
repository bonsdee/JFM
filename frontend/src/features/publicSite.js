import { useQuery, useMutation } from '@tanstack/react-query'
import { publicApi } from '@/lib/publicApi'
import { FALLBACK_SITE } from '@/components/landing/fallbackContent'

/**
 * Landing page content. Falls back to bundled defaults so the page renders instantly
 * (and still looks complete if the API is cold-starting on a free tier).
 */
export const usePublicSite = () =>
  useQuery({
    queryKey: ['public-site'],
    queryFn: () => publicApi.get('/site').then((r) => r.data),
    placeholderData: FALLBACK_SITE,
    staleTime: 120_000,
    retry: 1,
  })

export const usePublicQuote = () => useMutation({ mutationFn: (body) => publicApi.post('/quote', body).then((r) => r.data) })

export const useSendInquiry = () => useMutation({ mutationFn: (body) => publicApi.post('/inquiries', body).then((r) => r.data) })
