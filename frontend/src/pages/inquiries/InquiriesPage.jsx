import { useState } from 'react'
import { Archive, Check, Inbox, Mail, MailOpen, Phone, Reply } from 'lucide-react'
import { Button, Card, EmptyState, PageHeader, Pagination, SearchInput, Skeleton, StatusBadge, Tabs } from '@/components/ui'
import { useInquiries, useSetInquiryStatus } from '@/features/admin'
import { fmtDateTime, relative } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Inbox for the landing page contact form. */
export default function InquiriesPage() {
  const [tab, setTab] = useState('inbox')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const statusFor = { inbox: ['NEW', 'READ', 'REPLIED'], new: ['NEW'], replied: ['REPLIED'], archived: ['ARCHIVED'] }
  const { data, isLoading } = useInquiries({ status: statusFor[tab], q, page })
  const setStatus = useSetInquiryStatus()
  const current = data?.content.find((i) => i.id === selected) || data?.content[0]

  const open = (i) => {
    setSelected(i.id)
    if (i.status === 'NEW') setStatus.mutate({ id: i.id, status: 'READ' })
  }

  return (
    <>
      <PageHeader title="Inquiries" subtitle="Messages sent from the website contact form." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={(v) => { setTab(v); setPage(0); setSelected(null) }} tabs={[{ value: 'inbox', label: 'Inbox' }, { value: 'new', label: 'Unread' }, { value: 'replied', label: 'Replied' }, { value: 'archived', label: 'Archived' }]} />
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Search messages" className="w-64" />
      </div>
      {isLoading ? <Skeleton className="h-96 rounded-card" /> : !data?.content.length ? (
        <Card><EmptyState icon={Inbox} title="No messages here" message="New inquiries from your website will show up in this inbox." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line/60">
              {data.content.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => open(i)} className={cn('flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-subtle', current?.id === i.id && 'bg-primary-50/60 dark:bg-primary/10')}>
                    {i.status === 'NEW' ? <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2"><span className={cn('truncate text-sm', i.status === 'NEW' ? 'font-bold' : 'font-medium')}>{i.name}</span><span className="shrink-0 text-xs text-muted">{relative(i.createdAt)}</span></span>
                      <span className="block truncate text-xs text-muted">{i.serviceInterest || i.subject || 'General inquiry'}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted/80">{i.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={data} onPageChange={setPage} />
          </Card>
          {current && (
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{current.subject || 'Website inquiry'}</h2>
                  <p className="mt-1 text-sm text-muted">From {current.name} · {fmtDateTime(current.createdAt)}</p>
                </div>
                <StatusBadge kind="inquiry" status={current.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {current.email && <a href={`mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject || 'Your inquiry'}`)}`} className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 hover:bg-line"><Mail className="h-3.5 w-3.5" />{current.email}</a>}
                {current.phone && <a href={`tel:${current.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 hover:bg-line"><Phone className="h-3.5 w-3.5" />{current.phone}</a>}
              </div>
              <p className="mt-6 whitespace-pre-line rounded-2xl bg-subtle p-5 leading-relaxed">{current.message}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {current.email && <a href={`mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject || 'Your inquiry'}`)}`}><Button icon={Reply}>Reply by email</Button></a>}
                {current.status !== 'REPLIED' && <Button variant="secondary" icon={Check} onClick={() => setStatus.mutate({ id: current.id, status: 'REPLIED' })}>Mark replied</Button>}
                {current.status !== 'ARCHIVED' && <Button variant="ghost" icon={Archive} onClick={() => setStatus.mutate({ id: current.id, status: 'ARCHIVED' })}>Archive</Button>}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
