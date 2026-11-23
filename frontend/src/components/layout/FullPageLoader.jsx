import { Skeleton } from '@/components/ui/Display'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg" role="status" aria-label="Loading">
      <div className="relative h-14 w-14">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
        <span className="absolute inset-2 rounded-full bg-brand" />
      </div>
    </div>
  )
}

/** In-shell skeleton shown while a lazy page chunk loads. */
export function PageLoader() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)}
      </div>
      <Skeleton className="h-80 rounded-card" />
    </div>
  )
}
