import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, Field, Input, Skeleton, Tabs, Textarea } from '@/components/ui'
import { FileDrop } from '@/components/shared/FileDrop'
import { useSaveContent, useSiteContent } from '@/features/admin'
import { FALLBACK_SITE } from '@/components/landing/fallbackContent'

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
  { value: 'hero', label: 'Hero' },
  { value: 'stats', label: 'Stats' },
  { value: 'howItWorks', label: 'How it works' },
  { value: 'faq', label: 'FAQ' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'marquee', label: 'Marquee' },
  { value: 'contact', label: 'Contact' },
]

/** Website Content editor — every landing page block is editable here (served by /api/public/site). */
export function WebsiteContentEditor() {
  const { data, isLoading } = useSiteContent()
  const save = useSaveContent()
  const [section, setSection] = useState('hero')
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    if (!data) return
    const map = Object.fromEntries(data.map((b) => [b.key, b.content]))
    setDrafts(Object.fromEntries(SECTIONS.map((s) => [s.value, map[s.value] ?? FALLBACK_SITE.content[s.value]])))
  }, [data])

  if (isLoading || !drafts.hero) return <Skeleton className="h-96 rounded-card" />
  const value = drafts[section]
  const set = (v) => setDrafts((d) => ({ ...d, [section]: v }))

  return (
    <Card>
      <CardHeader title="Website content" subtitle="Changes appear on the public landing page within a couple of minutes."
        action={<a href="/" target="_blank" rel="noreferrer"><Button variant="secondary" size="sm" icon={ExternalLink}>View site</Button></a>} />
      <div className="space-y-5 p-5">
        <Tabs value={section} onChange={setSection} tabs={SECTIONS} />

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

        <div className="flex justify-end border-t border-line pt-4">
          <Button loading={save.isPending} onClick={() => save.mutate({ key: section, content: drafts[section] })}>Publish {SECTIONS.find((s) => s.value === section).label.toLowerCase()}</Button>
        </div>
      </div>
    </Card>
  )
}
