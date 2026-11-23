/**
 * Bundled defaults mirroring migration V2. Rendered immediately while /api/public/site loads,
 * so the landing page never shows a blank hero (and Lighthouse sees content on first paint).
 */
export const FALLBACK_SITE = {
  business: {
    name: 'JFM PrintHub',
    tagline: 'Print. Stock. Grow.',
    address: 'Rizal St., Poblacion, Your City, Philippines',
    phone: '0917 000 0000',
    email: 'hello@jfmprinthub.ph',
    facebookUrl: 'https://facebook.com/jfmprinthub',
  },
  content: {
    hero: {
      headline: 'Print. Stock. Grow.',
      subtext: 'Same-day tarpaulin, stickers, documents and ID photos — plus e-loading, bills payment and online application help, all in one friendly shop.',
      primaryCta: 'View Services',
      secondaryCta: 'Get a Quote',
    },
    stats: [
      { label: 'Tarps printed', value: 5000, suffix: '+' },
      { label: 'Happy customers', value: 3200, suffix: '+' },
      { label: 'Services offered', value: 10, suffix: '+' },
      { label: 'Same-day printing', value: 1, suffix: '', display: 'Same-day' },
    ],
    howItWorks: [
      { title: 'Send your design', description: 'Message us on Facebook or drop by with your file on a flash drive.' },
      { title: 'Approve the proof', description: 'We send a layout preview. Request changes until it is perfect.' },
      { title: 'We print', description: 'High-resolution eco-solvent and laser printing, done in-house.' },
      { title: 'Pick up', description: 'Get a text when it is ready. Pay the balance and claim your order.' },
    ],
    faq: [
      { q: 'How fast can you print a tarpaulin?', a: 'Most tarps are ready the same day if ordered before 2 PM. Rush orders are available for a small fee.' },
      { q: 'What file formats do you accept?', a: 'PDF, PNG, JPG, AI and PSD. For best results, send high-resolution files at actual size.' },
      { q: 'Do you offer layout or design services?', a: 'Yes. Our in-house designer can create your layout for a minimal design fee.' },
      { q: 'Do I need to pay a downpayment?', a: 'For job orders, a 50% downpayment is required. Walk-in printing and photocopy are paid upon release.' },
      { q: 'What payment methods do you accept?', a: 'Cash, GCash, Maya and bank transfer.' },
    ],
    gallery: [],
    marquee: ['Tarpaulin', 'Stickers', 'Business Cards', 'ID Photos', 'Lamination', 'Photocopy', 'Invitations', 'T-shirt Print', 'E-loading', 'Bills Payment'],
    contact: {
      address: 'Rizal St., Poblacion, Your City, Philippines',
      phone: '0917 000 0000',
      email: 'hello@jfmprinthub.ph',
      facebook: 'https://facebook.com/jfmprinthub',
      hours: [
        { days: 'Mon – Sat', time: '8:00 AM – 7:00 PM' },
        { days: 'Sunday', time: '9:00 AM – 3:00 PM' },
      ],
      mapEmbedUrl: 'https://www.google.com/maps?q=14.5995,120.9842&z=15&output=embed',
    },
  },
  services: [
    { slug: 'tarpaulin', name: 'Tarpaulin Printing', description: 'Vibrant eco-solvent tarps for events, business signage and birthdays.', pricingModel: 'PER_SQFT', startingPrice: 15, unitLabel: 'per sq ft', icon: 'Image', rushFeePercent: 25, minCharge: 150, addons: [] },
    { slug: 'stickers', name: 'Sticker Printing', description: 'Glossy and matte stickers, labels and decals — kiss-cut available.', pricingModel: 'PER_PIECE', startingPrice: 35, unitLabel: 'per A4 sheet', icon: 'Sticker', addons: [] },
    { slug: 'documents', name: 'Document Printing', description: 'Laser-sharp B&W and full-color printing for school and office.', pricingModel: 'PER_PAGE', startingPrice: 3, unitLabel: 'per page', icon: 'FileText', addons: [] },
    { slug: 'photocopy', name: 'Photocopy', description: 'Fast and clean photocopies — short, A4 and long bond.', pricingModel: 'PER_PAGE', startingPrice: 2, unitLabel: 'per page', icon: 'Copy', addons: [] },
    { slug: 'lamination', name: 'Lamination', description: 'Protect IDs, certificates and documents with hot lamination.', pricingModel: 'PER_PIECE', startingPrice: 20, unitLabel: 'per piece', icon: 'Layers', addons: [] },
    { slug: 'id-photo', name: 'ID Photo Package', description: '1x1 and 2x2 ID photos with formal attire editing in minutes.', pricingModel: 'FIXED', startingPrice: 80, unitLabel: 'per package', icon: 'Camera', addons: [] },
    { slug: 'business-cards', name: 'Business Cards', description: 'Premium 220gsm cards, matte or glossy, per 100 pieces.', pricingModel: 'PER_PIECE', startingPrice: 350, unitLabel: 'per 100 pcs', icon: 'CreditCard', addons: [] },
    { slug: 'invitations', name: 'Invitations', description: 'Wedding, debut, christening and birthday invitations.', pricingModel: 'PER_PIECE', startingPrice: 25, unitLabel: 'per piece', icon: 'Mail', addons: [] },
    { slug: 't-shirt', name: 'T-shirt Printing', description: 'Heat-transfer vinyl and sublimation prints for teams and events.', pricingModel: 'PER_PIECE', startingPrice: 250, unitLabel: 'per shirt', icon: 'Shirt', addons: [] },
    { slug: 'online-services', name: 'Online Services', description: 'E-loading, bills payment, and online application assistance (PSA, NBI, passport).', pricingModel: 'FIXED', startingPrice: 50, unitLabel: 'service fee', icon: 'Globe', addons: [] },
  ],
}
