import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Archive, Pencil, Plus, RotateCcw, Truck } from 'lucide-react'
import { Button, DataTable, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Tabs, Textarea } from '@/components/ui'
import { useArchiveSupplier, useSaveSupplier, useSuppliers } from '@/features/purchasing'
import { applyFieldErrors } from '@/features/mutation'

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().trim().email('Invalid email').or(z.literal('')).optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
})

export default function SuppliersPage() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('active')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null)
  const { data, isLoading } = useSuppliers({ q, page, archived: tab === 'archived' })
  const archive = useArchiveSupplier()

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Who you buy materials and retail items from." actions={<Button icon={Plus} onClick={() => setEditing({})}>Add supplier</Button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={(v) => { setTab(v); setPage(0) }} tabs={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Search suppliers" className="w-64" />
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.content}
        page={data}
        onPageChange={setPage}
        columns={[
          { key: 'name', header: 'Supplier', cell: (s) => <div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted">{s.address}</p></div> },
          { key: 'contactPerson', header: 'Contact' },
          { key: 'phone', header: 'Phone' },
          { key: 'email', header: 'Email', cell: (s) => s.email ? <a href={`mailto:${s.email}`} className="text-primary hover:underline">{s.email}</a> : '—' },
          { key: 'paymentTerms', header: 'Terms' },
          {
            key: 'a', header: '', align: 'right',
            cell: (s) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => archive.mutate({ id: s.id, archived: !s.archived })} aria-label={s.archived ? 'Restore' : 'Archive'}>
                  {s.archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>
              </div>
            ),
          },
        ]}
        empty={<EmptyState icon={Truck} title="No suppliers yet" message="Add suppliers to create purchase orders and reorder suggestions." action={<Button icon={Plus} onClick={() => setEditing({})}>Add supplier</Button>} />}
      />
      <SupplierModal supplier={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function SupplierModal({ supplier, onClose }) {
  const save = useSaveSupplier()
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    values: supplier ? { name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: '', notes: '', ...Object.fromEntries(Object.entries(supplier).map(([k, v]) => [k, v ?? ''])) } : undefined,
  })
  const submit = handleSubmit((v) => save.mutate({ id: supplier.id, ...v, email: v.email || null }, { onSuccess: onClose, onError: (e) => applyFieldErrors(e, setError) }))
  return (
    <Modal open={!!supplier} onClose={onClose} title={supplier?.id ? 'Edit supplier' : 'Add supplier'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save supplier</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message} required className="sm:col-span-2"><Input {...register('name')} invalid={!!errors.name} /></Field>
        <Field label="Contact person"><Input {...register('contactPerson')} /></Field>
        <Field label="Phone"><Input type="tel" {...register('phone')} /></Field>
        <Field label="Email" error={errors.email?.message}><Input type="email" {...register('email')} /></Field>
        <Field label="Payment terms" hint="e.g. COD, Net 30"><Input {...register('paymentTerms')} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input {...register('address')} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} {...register('notes')} /></Field>
      </form>
    </Modal>
  )
}
