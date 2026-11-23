import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Button, PageHeader } from '@/components/ui'
import { WebsiteContentEditor } from './WebsiteContentEditor'

/** Owner-facing editor for everything on the public landing page. */
export default function WebsitePage() {
  return (
    <>
      <PageHeader
        title="Website"
        subtitle="Services, text, photos and contact details on your public landing page."
        actions={<a href="/" target="_blank" rel="noreferrer"><Button variant="secondary" icon={ExternalLink}>View site</Button></a>}
      />
      <WebsiteContentEditor />
      <p className="mt-4 text-sm text-muted">
        The shop name, tagline and logo come from <Link to="/app/settings?tab=business" className="font-medium text-primary hover:underline">Settings → Business profile</Link>.
      </p>
    </>
  )
}
