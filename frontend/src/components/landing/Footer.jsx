import { Link } from 'react-router-dom'
import { Facebook, Mail, Phone } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { LANDING_LINKS } from './Navbar'

export function Footer({ business = {} }) {
  return (
    <footer className="border-t border-line/70 bg-bg">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{business.tagline || 'Print. Stock. Grow.'} Printing and online services for families, schools and small businesses.</p>
          <div className="mt-5 flex gap-2">
            {business.facebookUrl && <a href={business.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full border border-line p-2.5 text-muted hover:bg-subtle hover:text-ink"><Facebook className="h-4 w-4" /></a>}
            {business.email && <a href={`mailto:${business.email}`} aria-label="Email" className="rounded-full border border-line p-2.5 text-muted hover:bg-subtle hover:text-ink"><Mail className="h-4 w-4" /></a>}
            {business.phone && <a href={`tel:${business.phone.replace(/\s/g, '')}`} aria-label="Call" className="rounded-full border border-line p-2.5 text-muted hover:bg-subtle hover:text-ink"><Phone className="h-4 w-4" /></a>}
          </div>
        </div>
        <nav aria-label="Footer">
          <p className="mb-3 text-sm font-semibold">Explore</p>
          <ul className="space-y-2 text-sm text-muted">
            {LANDING_LINKS.map((l) => <li key={l.href}><a href={l.href} className="hover:text-ink">{l.label}</a></li>)}
          </ul>
        </nav>
        <div>
          <p className="mb-3 text-sm font-semibold">Visit</p>
          <p className="text-sm leading-relaxed text-muted">{business.address}</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Owner login</Link>
        </div>
      </div>
      <div className="border-t border-line/70 py-6 text-center text-xs text-muted">© {new Date().getFullYear()} {business.name || 'JFM PrintHub'}. All rights reserved.</div>
    </footer>
  )
}
