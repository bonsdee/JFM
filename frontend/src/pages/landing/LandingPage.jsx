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
        {services.length > 0 && <ServicesGrid services={services} />}
        {tarp && <TarpEstimator service={tarp} />}
        <HowItWorks steps={content.howItWorks} />
        <Gallery items={content.gallery} />
        <Marquee items={content.marquee} />
        <Faq items={content.faq} />
        <Contact contact={content.contact} services={services} />
      </main>
      <Footer business={business} />
    </div>
  )
}
