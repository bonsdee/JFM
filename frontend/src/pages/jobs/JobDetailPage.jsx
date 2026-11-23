import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Ban, CheckCircle2, Download, FileText, HandCoins, PackageCheck, Pencil, Printer, Receipt, Ticket, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, ConfirmDialog, DescriptionList, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, StatusBadge, Textarea } from '@/components/ui'
import { FileDrop } from '@/components/shared/FileDrop'
import { useDeleteJobFile, useJob, useJobAction, useMoveJob } from '@/features/jobs'
import { fetchFile } from '@/lib/files'
import { JOB_STATUS, PAYMENT_LABEL, PAYMENT_METHODS } from '@/lib/constants'
import { fmtDateTime, peso, relative } from '@/lib/format'
import { cn } from '@/lib/cn'

const PIPELINE = ['PENDING', 'DESIGNING', 'FOR_APPROVAL', 'PRINTING', 'READY_FOR_PICKUP', 'CLAIMED']

export default function JobDetailPage() {
  const { id } = useParams()
  const { data: job, isLoading } = useJob(id)
  const action = useJobAction()
  const move = useMoveJob()
  const delFile = useDeleteJobFile()
  const [paying, setPaying] = useState(null) // 'payment' | 'claim'
  const [cancelling, setCancelling] = useState(false)
  const [printing, setPrinting] = useState(false)

  if (isLoading) return <Skeleton className="h-96 rounded-card" />
  if (!job) return <EmptyState icon={Printer} title="Job order not found" />
  const open = !['CLAIMED', 'CANCELLED'].includes(job.status)
  const editable = ['PENDING', 'DESIGNING', 'FOR_APPROVAL'].includes(job.status)
  const stage = PIPELINE.indexOf(job.status)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Job orders', to: '/app/jobs' }, { label: job.jobNumber }]}
        title={<span className="flex flex-wrap items-center gap-3">{job.jobNumber} <StatusBadge kind="job" status={job.status} /></span>}
        subtitle={`${job.customerName}${job.customerPhone ? ` · ${job.customerPhone}` : ''} · created ${relative(job.createdAt)}`}
        actions={
          <>
            <Button variant="secondary" icon={Ticket} onClick={() => fetchFile(`/job-orders/${id}/ticket.pdf`, { download: false }).catch((e) => toast.error(e.message))}>Job ticket</Button>
            {editable && <Link to={`/app/jobs/${id}/edit`}><Button variant="secondary" icon={Pencil}>Edit</Button></Link>}
            {open && <Button variant="danger-soft" icon={Ban} onClick={() => setCancelling(true)}>Cancel</Button>}
            {open && job.balance > 0 && <Button variant="secondary" icon={HandCoins} onClick={() => setPaying('payment')}>Add payment</Button>}
            {open && !job.materialsConsumed && <Button variant="secondary" icon={PackageCheck} onClick={() => setPrinting(true)}>Mark printed</Button>}
            {job.status === 'READY_FOR_PICKUP' && <Button icon={CheckCircle2} onClick={() => setPaying('claim')}>Release to customer</Button>}
            {job.saleId && <Link to={`/app/sales/${job.saleId}`}><Button variant="secondary" icon={Receipt}>View sale</Button></Link>}
          </>
        }
      />

      {/* Pipeline stepper */}
      {job.status !== 'CANCELLED' && (
        <Card className="mb-4 p-4">
          <ol className="scrollbar-thin flex items-center gap-2 overflow-x-auto">
            {PIPELINE.map((s, i) => (
              <li key={s} className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={!open || s === 'CLAIMED' || s === job.status || (job.status === 'READY_FOR_PICKUP' && i < 3)}
                  onClick={() => (s === 'READY_FOR_PICKUP' && !job.materialsConsumed ? setPrinting(true) : move.mutate({ id, status: s }))}
                  className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold transition disabled:cursor-default',
                    i < stage && 'bg-success-50 text-success-700 dark:bg-success/15 dark:text-emerald-300',
                    i === stage && 'bg-brand text-white shadow-soft',
                    i > stage && 'bg-subtle text-muted enabled:hover:bg-primary-50 enabled:hover:text-primary-700')}
                >
                  {JOB_STATUS[s].label}
                </button>
                {i < PIPELINE.length - 1 && <span className={cn('h-0.5 w-6 rounded-full', i < stage ? 'bg-success' : 'bg-line')} aria-hidden />}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Items & specs" subtitle={job.materialsConsumed ? `Materials deducted ${fmtDateTime(job.printedAt)}` : 'Materials are deducted when the job is marked printed'} />
            <ul className="divide-y divide-line/60 p-2">
              {job.items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-4 px-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{i.description}</p>
                    <p className="text-xs text-muted">{i.serviceName}{i.specs?.notes ? ` · ${i.specs.notes}` : ''}</p>
                    {job.materialsConsumed && <p className="text-xs text-muted">Material cost {peso(i.materialCost)}</p>}
                  </div>
                  <p className="tabular shrink-0 font-semibold">{peso(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-line bg-subtle/40 px-5 py-4 text-sm">
              {job.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted">Discount</span><span className="tabular">−{peso(job.discountAmount)}</span></div>}
              <div className="flex justify-between"><span className="font-semibold">Total</span><span className="tabular font-display text-lg font-extrabold">{peso(job.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Paid</span><span className="tabular">{peso(job.amountPaid)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Balance</span><span className={cn('tabular font-bold', job.balance > 0 ? 'text-warning-700 dark:text-amber-300' : 'text-success-700 dark:text-emerald-300')}>{peso(job.balance)}</span></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Design files" subtitle="Stored privately in Supabase Storage" />
            <div className="space-y-3 p-5">
              {job.files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-line/70 px-3 py-2.5">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{f.fileName}</p><p className="text-xs text-muted">{f.sizeBytes ? `${(f.sizeBytes / 1024 / 1024).toFixed(2)} MB · ` : ''}{relative(f.createdAt)}</p></div>
                  {f.downloadUrl && <a href={f.downloadUrl} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon-sm" aria-label={`Download ${f.fileName}`}><Download className="h-4 w-4" /></Button></a>}
                  <Button variant="ghost" size="icon-sm" onClick={() => delFile.mutate({ id, fileId: f.id })} aria-label={`Remove ${f.fileName}`}><Trash2 className="h-4 w-4 text-danger" /></Button>
                </div>
              ))}
              <FileDrop bucket="JOB_FILES" folder={job.jobNumber} multiple maxMb={10} label="Drop design files or click to upload"
                onUploaded={({ path, file }) => action.mutateAsync({ id, action: 'files', body: { path, fileName: file.name, contentType: file.type, sizeBytes: file.size } })} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <DescriptionList items={[
              { label: 'Customer', value: job.customerId ? <Link className="text-primary hover:underline" to={`/app/customers/${job.customerId}`}>{job.customerName}</Link> : job.customerName },
              { label: 'Phone', value: job.customerPhone },
              { label: 'Due', value: <span className={job.overdue ? 'font-semibold text-danger' : ''}>{fmtDateTime(job.dueAt)}{job.overdue ? ' (overdue)' : ''}</span> },
              { label: 'Claimed', value: job.claimedAt ? fmtDateTime(job.claimedAt) : null },
              job.cancelReason && { label: 'Cancel reason', value: job.cancelReason },
            ]} />
            {job.notes && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm text-muted">{job.notes}</p>}
          </Card>
          <Card>
            <CardHeader title="Payments" />
            <ul className="divide-y divide-line/60 p-3">
              {!job.payments.length && <li className="px-2 py-4 text-sm text-muted">No payments yet.</li>}
              {job.payments.map((p) => (
                <li key={p.id} className="flex justify-between px-2 py-2.5 text-sm">
                  <span><span className="font-medium">{PAYMENT_LABEL[p.method]}</span>{p.notes && <span className="text-muted"> · {p.notes}</span>}<span className="block text-xs text-muted">{fmtDateTime(p.paidAt)}{p.referenceNo ? ` · ${p.referenceNo}` : ''}</span></span>
                  <span className="tabular font-semibold">{peso(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <PaymentModal mode={paying} job={job} onClose={() => setPaying(null)} action={action} />
      <ConfirmDialog open={printing} onClose={() => setPrinting(false)} tone="primary" loading={action.isPending}
        title={`Mark ${job.jobNumber} as printed?`} confirmLabel="Mark printed"
        message="Materials from each service's bill of materials will be deducted from stock and the job moves to Ready for pickup."
        onConfirm={() => action.mutate({ id, action: 'mark-printed' }, { onSuccess: () => setPrinting(false) })} />
      <CancelModal open={cancelling} job={job} onClose={() => setCancelling(false)} action={action} />
    </>
  )
}

function PaymentModal({ mode, job, onClose, action }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [referenceNo, setRef] = useState('')
  const claim = mode === 'claim'
  const due = Number(job.balance)
  const submit = () => {
    const pay = Number(claim ? amount || due : amount)
    const payment = pay > 0 ? { amount: pay, method, referenceNo: referenceNo || null } : null
    if (claim) action.mutate({ id: job.id, action: 'claim', body: { balancePayment: payment } }, { onSuccess: onClose })
    else action.mutate({ id: job.id, action: 'payments', body: payment }, { onSuccess: () => { setAmount(''); onClose() } })
  }
  return (
    <Modal open={!!mode} onClose={onClose} size="sm" title={claim ? `Release ${job.jobNumber}` : 'Add payment'}
      description={claim ? (due > 0 ? `Collect the balance of ${peso(due)} to release.` : 'Fully paid. Releasing creates the sale record.') : `Balance ${peso(due)}`}
      footer={<Button loading={action.isPending} onClick={submit} disabled={!claim && !(Number(amount) > 0)}>{claim ? 'Release & record sale' : 'Record payment'}</Button>}>
      {(due > 0) && (
        <div className="space-y-4">
          <Field label="Amount"><Input type="number" min="0" step="0.01" prefix="₱" placeholder={due.toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)} options={PAYMENT_METHODS} /></Field>
          {method !== 'CASH' && <Field label="Reference no."><Input value={referenceNo} onChange={(e) => setRef(e.target.value)} /></Field>}
        </div>
      )}
    </Modal>
  )
}

function CancelModal({ open, job, onClose, action }) {
  const [reason, setReason] = useState('')
  return (
    <Modal open={open} onClose={onClose} size="sm" title={`Cancel ${job.jobNumber}?`}
      description={job.materialsConsumed ? 'Materials already deducted are not returned to stock.' : 'No stock has been used yet.'}
      footer={<><Button variant="secondary" onClick={onClose}>Keep job</Button><Button variant="danger" disabled={!reason.trim()} loading={action.isPending} onClick={() => action.mutate({ id: job.id, action: 'cancel', body: { reason } }, { onSuccess: onClose })}>Cancel job order</Button></>}>
      <Field label="Reason" required><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer changed their mind" /></Field>
      {job.amountPaid > 0 && <p className="mt-3 text-sm text-warning-700 dark:text-amber-300">{peso(job.amountPaid)} was paid. Handle any refund outside the system and note it here.</p>}
    </Modal>
  )
}
