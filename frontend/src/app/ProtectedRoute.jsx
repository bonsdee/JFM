import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { FullPageLoader } from '@/components/layout/FullPageLoader'

/** Gate for /app/*: waits for the persisted session, then redirects to /login when signed out. */
export function ProtectedRoute({ children }) {
  const { session, ready } = useAuthStore()
  const location = useLocation()
  if (!ready) return <FullPageLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

/** Keeps signed-in owners out of /login. */
export function GuestOnly({ children }) {
  const { session, ready } = useAuthStore()
  if (!ready) return <FullPageLoader />
  if (session) return <Navigate to="/app" replace />
  return children
}
