import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'framer-motion'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => (err?.status >= 400 && err?.status < 500 ? false : count < 2),
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every Framer animation honour prefers-reduced-motion */}
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          className: '!rounded-2xl !bg-surface !text-ink !shadow-lift !border !border-line !text-sm',
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' }, duration: 5000 },
        }}
      />
    </QueryClientProvider>
  )
}
