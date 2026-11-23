import { useEffect } from 'react'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { TrustStrip, ServicesGrid, Marquee, Faq } from '@/components/landing/Sections'
import { TarpEstimator } from '@/components/landing/TarpEstimator'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Gallery } from '@/components/landing/Gallery'
import { Contact } from '@/components/landing/Contact'
import { Footer } from '@/components/landing/Footer'
import { CursorBlob } from '@/components/landing/BubbleBackground'
import { usePublicSite } from '@/features/publicSite'
import { FALLBACK_SITE } from '@/components/landing/fallbackContent'

/** Public landing page. All copy, prices, stats, FAQ, gallery and contact info come from /api/public/site. */
export default function LandingPage() {
  const { data = FALLBACK_SITE } = usePublicSite()
  const content = { ...FALLBACK_SITE.content, ...(data.content || {}) }
  // Bundled services only show while the first request is in flight; afterwards the real list (even if empty) wins.
  const services = data.services ?? FALLBACK_SITE.services
  const business = { ...FALLBACK_SITE.business, ...(data.business || {}) }
  // Saved titles win; a blank title falls back to the default, a blank subtitle hides it.
  const heading = (key) => {
    const def = FALLBACK_SITE.content.sections[key]
    const saved = content.sections?.[key] || {}
    return { title: saved.title?.trim() || def.title, subtitle: saved.subtitle ?? def.subtitle }
  }
  const tarp = services.find((s) => s.pricingModel === 'PER_SQFT') || services.find((s) => s.slug === 'tarpaulin')

  useEffect(() => {
    document.title = `${business.name} — Printing & Online Services`
  }, [business.name])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
      <CursorBlob />
      <Navbar />
      <main>
        <Hero hero={content.hero} business={business} />
        <TrustStrip stats={content.stats} />
        {services.length > 0 && <ServicesGrid services={services} heading={heading('services')} />}
        {tarp && <TarpEstimator service={tarp} heading={heading('estimator')} />}
        <HowItWorks steps={content.howItWorks} heading={heading('howItWorks')} />
        <Gallery items={content.gallery} heading={heading('gallery')} />
        <Marquee items={content.marquee} />
        <Faq items={content.faq} heading={heading('faq')} />
        <Contact contact={content.contact} services={services} heading={heading('contact')} />
      </main>
      <Footer business={business} />
    </div>
  )
}
