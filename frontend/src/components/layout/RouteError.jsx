import { Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

/** Shown when a route throws (e.g. a chunk failed to load after a deploy). */
export function RouteError() {
  const error = useRouteError()
  const chunk = /dynamically imported module|Loading chunk/i.test(error?.message || '')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <h1 className="text-2xl font-extrabold">{chunk ? 'A new version is available' : 'This page could not load'}</h1>
      <p className="max-w-md text-sm text-muted">
        {chunk ? 'Reload to get the latest version of PrintHub.' : error?.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Link to="/app"><Button variant="secondary">Go to dashboard</Button></Link>
      </div>
    </div>
  )
}
