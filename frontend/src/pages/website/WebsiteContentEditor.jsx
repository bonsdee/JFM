import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Skeleton, Tabs, Textarea, Toggle } from '@/components/ui'
import { FileDrop } from '@/components/shared/FileDrop'
import { useSaveContent, useSiteContent } from '@/features/admin'
import { FALLBACK_SITE } from '@/components/landing/fallbackContent'
import { iconFor } from '@/components/landing/serviceIcons'
import { useServices, useUpdateWebsiteServices } from '@/features/services'
import { ServiceDrawer, priceSummary } from '@/pages/services/ServicesPage'

/** Reorderable list of objects. fields: [{ key, label, type?: 'textarea'|'number', placeholder? }] */
function ListEditor({ items, onChange, fields, newItem, addLabel = 'Add item', renderExtra }) {
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i, d) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n) }
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl border border-line/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} className={f.type === 'textarea' || f.wide ? 'sm:col-span-2' : ''}>
                {f.type === 'textarea'
                  ? <Textarea rows={2} value={it[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => update(i, { [f.key]: e.target.value })} />
                  : <Input type={f.type || 'text'} value={it[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => update(i, { [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />}
              </Field>
            ))}
          </div>
          {renderExtra?.(it, i, (patch) => update(i, patch))}
          <div className="mt-3 flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-4 w-4 text-danger" /></Button>
          </div>
        </div>
      ))}
      <Button variant="soft" size="sm" icon={Plus} onClick={() => onChange([...items, { ...newItem }])}>{addLabel}</Button>
    </div>
  )
}

const SECTIONS = [
  { value: 'services', label: 'Services' },
  { value: 'hero', label: 'Hero' },
  { value: 'stats', label: 'Stats' },
  { value: 'howItWorks', label: 'How it works' },
  { value: 'faq', label: 'FAQ' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'marquee', label: 'Marquee' },
  { value: 'contact', label: 'Contact' },
  { value: 'sections', label: 'Section titles' },
]
/** Tabs saved as site_content blocks (Services saves straight to the service catalog). */
const CONTENT_SECTIONS = SECTIONS.filter((s) => s.value !== 'services')

const HEADING_FIELDS = [
  { key: 'services', label: 'Services' },
  { key: 'estimator', label: 'Tarp price estimator', subtitleHint: 'Leave blank to show the current rate and minimum automatically' },
  { key: 'howItWorks', label: 'How it works' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Contact' },
]

/** Services tab: which services the landing page shows, in what order. Changes save immediately. */
function WebsiteServices() {
  const { data, isLoading } = useServices(false)
  const update = useUpdateWebsiteServices()
  const [editing, setEditing] = useState(null)

  if (isLoading) return <Skeleton className="h-64 rounded-card" />
  const list = data || []
  const shown = list.filter((s) => s.showOnWebsite && s.active).length

  const move = (i, d) => {
    const next = [...list]
    const [x] = next.splice(i, 1)
    next.splice(i + d, 0, x)
    const changes = next.map((service, idx) => ({ service, patch: { sortOrder: (idx + 1) * 10 } }))
      .filter(({ service, patch }) => service.sortOrder !== patch.sortOrder)
    if (changes.length) update.mutate(changes)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {shown} of {list.length} shown on the website, in this order. Edit a service to change its name, description, icon or price.
        </p>
        <Button size="sm" icon={Plus} onClick={() => setEditing({})}>Add service</Button>
      </div>
      {!list.length && (
        <EmptyState icon={Layers} title="No services yet" message="Services you add here appear on the landing page and in the price estimator."
          action={<Button icon={Plus} onClick={() => setEditing({})}>Add service</Button>} />
      )}
      <div className="space-y-3">
        {list.map((s, i) => {
          const Icon = iconFor(s.icon)
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line/70 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary dark:bg-primary/15"><Icon className="h-5 w-5" aria-hidden /></span>
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{s.name}</p>
                  {!s.active && <Badge tone="warning">Inactive, so hidden</Badge>}
                </div>
                <p className="tabular text-xs text-muted">{priceSummary(s)}</p>
                {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Toggle checked={s.showOnWebsite} disabled={update.isPending} label="On website"
                  onChange={(v) => update.mutate([{ service: s, patch: { showOnWebsite: v } }])} />
                <Button variant="ghost" size="icon-sm" disabled={i === 0 || update.isPending} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" disabled={i === list.length - 1 || update.isPending} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(s)}>Edit</Button>
              </div>
            </div>
          )
        })}
      </div>
      <ServiceDrawer service={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

/** Website editor: every landing page block is editable here (served by /api/public/site). */
export function WebsiteContentEditor() {
  const { data, isLoading } = useSiteContent()
  const save = useSaveContent()
  const [section, setSection] = useState('services')
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    if (!data) return
    const map = Object.fromEntries(data.map((b) => [b.key, b.content]))
    setDrafts(Object.fromEntries(CONTENT_SECTIONS.map((s) => {
      const fallback = FALLBACK_SITE.content[s.value]
      // Section titles merge per section, so blocks added later still get their defaults.
      if (s.value === 'sections') return [s.value, Object.fromEntries(Object.keys(fallback).map((k) => [k, { ...fallback[k], ...(map.sections?.[k] || {}) }]))]
      return [s.value, map[s.value] ?? fallback]
    })))
  }, [data])

  if (isLoading || !drafts.hero) return <Skeleton className="h-96 rounded-card" />
  const value = drafts[section]
  const set = (v) => setDrafts((d) => ({ ...d, [section]: v }))

  return (
    <Card>
      <CardHeader title="Landing page" subtitle="Published changes appear on the public site within about 2 minutes." />
      <div className="space-y-5 p-5">
        <Tabs value={section} onChange={setSection} tabs={SECTIONS} />

        {section === 'services' && <WebsiteServices />}

        {section === 'hero' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Headline" hint="Each full stop becomes a gradient bubble" className="sm:col-span-2"><Input value={value.headline || ''} onChange={(e) => set({ ...value, headline: e.target.value })} /></Field>
            <Field label="Supporting text" className="sm:col-span-2"><Textarea rows={3} value={value.subtext || ''} onChange={(e) => set({ ...value, subtext: e.target.value })} /></Field>
            <Field label="Primary button"><Input value={value.primaryCta || ''} onChange={(e) => set({ ...value, primaryCta: e.target.value })} /></Field>
            <Field label="Secondary button"><Input value={value.secondaryCta || ''} onChange={(e) => set({ ...value, secondaryCta: e.target.value })} /></Field>
          </div>
        )}
        {section === 'stats' && (
          <ListEditor items={value} onChange={set} newItem={{ label: '', value: 0, suffix: '+' }} addLabel="Add stat"
            fields={[{ key: 'label', label: 'Label' }, { key: 'value', label: 'Number', type: 'number' }, { key: 'suffix', label: 'Suffix', placeholder: '+' }, { key: 'display', label: 'Text instead of number', placeholder: 'e.g. Same-day' }]} />
        )}
        {section === 'howItWorks' && (
          <ListEditor items={value} onChange={set} newItem={{ title: '', description: '' }} addLabel="Add step"
            fields={[{ key: 'title', label: 'Step title', wide: true }, { key: 'description', label: 'Description', type: 'textarea' }]} />
        )}
        {section === 'faq' && (
          <ListEditor items={value} onChange={set} newItem={{ q: '', a: '' }} addLabel="Add question"
            fields={[{ key: 'q', label: 'Question', wide: true }, { key: 'a', label: 'Answer', type: 'textarea' }]} />
        )}
        {section === 'gallery' && (
          <div className="space-y-4">
            <FileDrop bucket="BUSINESS_ASSETS" folder="gallery" accept="image/*" multiple maxMb={6} label="Upload sample work photos"
              onUploaded={({ path, publicUrl, file }) => setDrafts((d) => ({ ...d, gallery: [...(d.gallery || []), { path, url: publicUrl, title: file.name.replace(/\.[^.]+$/, ''), caption: '' }] }))} />
            <ListEditor items={value} onChange={set} newItem={{ title: '', caption: '', url: '' }} addLabel="Add by URL"
              fields={[{ key: 'title', label: 'Title' }, { key: 'caption', label: 'Caption' }, { key: 'url', label: 'Image URL (if not uploaded)', wide: true }]}
              renderExtra={(it) => (it.url ? <img src={it.url} alt="" className="mt-3 h-24 rounded-xl object-cover" /> : null)} />
          </div>
        )}
        {section === 'marquee' && (
          <Field label="Keywords" hint="One per line — scroll across the page between Gallery and FAQ">
            <Textarea rows={8} value={(value || []).join('\n')} onChange={(e) => set(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
          </Field>
        )}
        {section === 'contact' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" className="sm:col-span-2"><Input value={value.address || ''} onChange={(e) => set({ ...value, address: e.target.value })} /></Field>
              <Field label="Phone"><Input value={value.phone || ''} onChange={(e) => set({ ...value, phone: e.target.value })} /></Field>
              <Field label="Email"><Input value={value.email || ''} onChange={(e) => set({ ...value, email: e.target.value })} /></Field>
              <Field label="Facebook page URL" className="sm:col-span-2"><Input value={value.facebook || ''} onChange={(e) => set({ ...value, facebook: e.target.value })} /></Field>
              <Field label="Google Maps embed URL" hint="Google Maps → Share → Embed a map → copy the src URL" className="sm:col-span-2"><Input value={value.mapEmbedUrl || ''} onChange={(e) => set({ ...value, mapEmbedUrl: e.target.value })} /></Field>
            </div>
            <p className="text-sm font-semibold">Business hours</p>
            <ListEditor items={value.hours || []} onChange={(hours) => set({ ...value, hours })} newItem={{ days: '', time: '' }} addLabel="Add hours"
              fields={[{ key: 'days', label: 'Days', placeholder: 'Mon – Sat' }, { key: 'time', label: 'Time', placeholder: '8:00 AM – 7:00 PM' }]} />
          </div>
        )}

        {section === 'sections' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">The heading and short line above each part of the page. A blank title uses the default; a blank subtitle hides it.</p>
            {HEADING_FIELDS.map((h) => (
              <div key={h.key} className="grid gap-3 rounded-2xl border border-line/70 p-4 sm:grid-cols-2">
                <p className="text-sm font-semibold sm:col-span-2">{h.label}</p>
                <Field label="Title"><Input value={value[h.key]?.title ?? ''} placeholder={FALLBACK_SITE.content.sections[h.key].title}
                  onChange={(e) => set({ ...value, [h.key]: { ...value[h.key], title: e.target.value } })} /></Field>
                <Field label="Subtitle" hint={h.subtitleHint}><Textarea rows={2} value={value[h.key]?.subtitle ?? ''}
                  onChange={(e) => set({ ...value, [h.key]: { ...value[h.key], subtitle: e.target.value } })} /></Field>
              </div>
            ))}
          </div>
        )}

        {section !== 'services' && (
        <div className="flex justify-end border-t border-line pt-4">
          <Button loading={save.isPending} onClick={() => save.mutate({ key: section, content: drafts[section] })}>Publish {SECTIONS.find((s) => s.value === section).label.toLowerCase()}</Button>
        </div>
        )}
      </div>
    </Card>
  )
}
