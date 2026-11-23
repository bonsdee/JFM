import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, Columns3, MoreHorizontal, Paperclip, Plus, Printer, Table2 } from 'lucide-react'
import { Button, DataTable, Dropdown, EmptyState, PageHeader, SearchInput, Segmented, Select, Skeleton, StatusBadge, Toggle } from '@/components/ui'
import { useJobBoard, useJobs, useMoveJob } from '@/features/jobs'
import { JOB_STATUS, JOB_STATUSES } from '@/lib/constants'
import { fmtShort, peso, relative } from '@/lib/format'
import { cn } from '@/lib/cn'

const BOARD = ['PENDING', 'DESIGNING', 'FOR_APPROVAL', 'PRINTING', 'READY_FOR_PICKUP']
const DOT = { neutral: 'bg-slate-400', violet: 'bg-violet', warning: 'bg-warning', primary: 'bg-primary', accent: 'bg-accent', success: 'bg-success', danger: 'bg-danger' }

export default function JobsPage() {
  const [view, setView] = useState(() => { try { return localStorage.getItem('jfm-jobs-view') || 'board' } catch { return 'board' } })
  const changeView = (v) => { setView(v); try { localStorage.setItem('jfm-jobs-view', v) } catch { /* ignore */ } }
  return (
    <>
      <PageHeader
        title="Job orders"
        subtitle="Drag cards across the pipeline. Moving a job to Ready for pickup deducts its materials."
        actions={
          <>
            <Segmented value={view} onChange={changeView} options={[{ value: 'board', label: <span className="flex items-center gap-1.5"><Columns3 className="h-4 w-4" />Board</span> }, { value: 'table', label: <span className="flex items-center gap-1.5"><Table2 className="h-4 w-4" />Table</span> }]} />
            <Link to="/app/jobs/new"><Button icon={Plus}>New job order</Button></Link>
          </>
        }
      />
      {view === 'board' ? <Board /> : <JobsTable />}
    </>
  )
}

function JobCard({ job, onMove }) {
  const navigate = useNavigate()
  return (
    <motion.div
      layout
      layoutId={job.id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/job', job.id); e.dataTransfer.effectAllowed = 'move' }}
      onClick={() => navigate(`/app/jobs/${job.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/app/jobs/${job.id}`)}
      tabIndex={0}
      role="button"
      aria-label={`${job.jobNumber}, ${job.customerName}`}
      className={cn('group cursor-grab rounded-2xl border bg-surface p-3.5 shadow-soft transition hover:shadow-lift active:cursor-grabbing', job.overdue ? 'border-danger/40 ring-1 ring-danger/20' : 'border-line/70')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">{job.jobNumber}</p>
          <p className="truncate font-semibold">{job.customerName}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={({ toggle }) => <button type="button" onClick={toggle} className="rounded-full p-1 text-muted opacity-60 hover:bg-subtle group-hover:opacity-100" aria-label="Move job"><MoreHorizontal className="h-4 w-4" /></button>}
            items={BOARD.filter((s) => s !== job.status).map((s) => ({ label: `Move to ${JOB_STATUS[s].label.toLowerCase()}`, onClick: () => onMove(job, s) }))}
          />
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs text-muted">{job.itemsSummary}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
        <span className={cn('flex items-center gap-1', job.overdue ? 'font-semibold text-danger' : 'text-muted')}>
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />{job.dueAt ? (job.overdue ? `Overdue ${relative(job.dueAt)}` : fmtShort(job.dueAt)) : 'No due date'}
        </span>
        <span className="flex items-center gap-2">
          {job.fileCount > 0 && <span className="flex items-center gap-0.5 text-muted"><Paperclip className="h-3 w-3" />{job.fileCount}</span>}
          <span className={cn('tabular font-semibold', job.balance > 0 ? 'text-warning-700 dark:text-amber-300' : 'text-success-700 dark:text-emerald-300')}>{job.balance > 0 ? `${peso(job.balance)} due` : 'Paid'}</span>
        </span>
      </div>
    </motion.div>
  )
}

function Board() {
  const { data, isLoading } = useJobBoard()
  const move = useMoveJob()
  const [over, setOver] = useState(null)
  const onMove = (job, status) => move.mutate({ id: job.id, status })

  if (isLoading) return <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">{BOARD.map((s) => <Skeleton key={s} className="h-80 rounded-card" />)}</div>

  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="grid grid-cols-[repeat(6,minmax(232px,1fr))] gap-4">
        {[...BOARD, 'CLAIMED'].map((status) => {
          const jobs = data?.[status] || []
          const droppable = status !== 'CLAIMED'
          const meta = JOB_STATUS[status]
          return (
            <section
              key={status}
              aria-label={meta.label}
              onDragOver={droppable ? (e) => { e.preventDefault(); setOver(status) } : undefined}
              onDragLeave={() => setOver(null)}
              onDrop={droppable ? (e) => {
                e.preventDefault(); setOver(null)
                const id = e.dataTransfer.getData('text/job')
                const job = Object.values(data).flat().find((j) => j.id === id)
                if (job && job.status !== status) onMove(job, status)
              } : undefined}
              className={cn('flex min-h-[60vh] flex-col rounded-[24px] border p-3 transition', over === status ? 'border-primary bg-primary-50/50 dark:bg-primary/10' : 'border-transparent bg-subtle/70')}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <span className={cn('h-2.5 w-2.5 rounded-full', DOT[meta.tone])} aria-hidden />
                  {status === 'CLAIMED' ? 'Claimed (3 days)' : meta.label}
                </h2>
                <span className="tabular rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{jobs.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2.5">
                <AnimatePresence initial={false}>
                  {jobs.map((j) => <JobCard key={j.id} job={j} onMove={onMove} />)}
                </AnimatePresence>
                {!jobs.length && <p className="px-2 py-6 text-center text-xs text-muted">{droppable ? 'Drop a job here' : 'Nothing claimed recently'}</p>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function JobsTable() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [overdue, setOverdue] = useState(false)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('createdAt,desc')
  const { data, isLoading } = useJobs({ q, status: status ? [status] : undefined, overdue, page, sort })
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Job #, customer or phone" className="w-64" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} placeholder="All statuses" className="w-48">
          {JOB_STATUSES.map((s) => <option key={s} value={s}>{JOB_STATUS[s].label}</option>)}
        </Select>
        <Toggle checked={overdue} onChange={(v) => { setOverdue(v); setPage(0) }} label="Overdue only" />
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.content}
        page={data}
        onPageChange={setPage}
        sort={sort}
        onSort={setSort}
        onRowClick={(j) => navigate(`/app/jobs/${j.id}`)}
        columns={[
          { key: 'jobNumber', header: 'Job #', sortable: true, cell: (j) => <span className="font-semibold">{j.jobNumber}</span> },
          { key: 'customerName', header: 'Customer', cell: (j) => <div><p className="font-medium">{j.customerName}</p><p className="text-xs text-muted">{j.customerPhone}</p></div> },
          { key: 'itemsSummary', header: 'Items', cell: (j) => <span className="line-clamp-1 max-w-xs text-muted">{j.itemsSummary}</span> },
          { key: 'status', header: 'Status', cell: (j) => <StatusBadge kind="job" status={j.status} /> },
          { key: 'dueAt', header: 'Due', sortable: true, cell: (j) => <span className={j.overdue ? 'font-semibold text-danger' : ''}>{fmtShort(j.dueAt)}</span> },
          { key: 'total', header: 'Total', sortable: true, align: 'right', cell: (j) => peso(j.total) },
          { key: 'balance', header: 'Balance', align: 'right', cell: (j) => <span className={j.balance > 0 ? 'font-semibold text-warning-700 dark:text-amber-300' : 'text-muted'}>{peso(j.balance)}</span> },
        ]}
        empty={<EmptyState icon={Printer} title="No job orders found" action={<Link to="/app/jobs/new"><Button icon={Plus}>New job order</Button></Link>} />}
      />
    </>
  )
}
