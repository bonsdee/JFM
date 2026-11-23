import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { EmptyState } from '@/components/ui/Display'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        message="The link may be outdated or the record was archived."
        action={<Link to="/app"><Button>Back to dashboard</Button></Link>}
      />
    </div>
  )
}
