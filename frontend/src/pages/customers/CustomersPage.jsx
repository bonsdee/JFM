import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Users } from 'lucide-react'
import { Button, DataTable, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Tabs, Textarea } from '@/components/ui'
import { useCustomers, useSaveCustomer } from '@/features/customers'
import { applyFieldErrors } from '@/features/mutation'
import { fmtDate } from '@/lib/format'

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().trim().email('Invalid email').or(z.literal('')).optional(),
  facebookName: z.string().optional(),
  notes: z.string().optional(),
})

export default function CustomersPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('active')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('name,asc')
  const [editing, setEditing] = useState(null)
  const { data, isLoading } = useCustomers({ q, page, sort, archived: tab === 'archived' })

  return (
    <>
      <PageHeader title="Customers" subtitle="Regulars, schools and businesses — with their history and balances." actions={<Button icon={Plus} onClick={() => setEditing({})}>Add customer</Button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={(v) => { setTab(v); setPage(0) }} tabs={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Name, phone or Facebook" className="w-64" />
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.content}
        page={data}
        onPageChange={setPage}
        sort={sort}
        onSort={setSort}
        onRowClick={(c) => navigate(`/app/customers/${c.id}`)}
        columns={[
          { key: 'name', header: 'Name', sortable: true, cell: (c) => <span className="font-semibold">{c.name}</span> },
          { key: 'phone', header: 'Phone' },
          { key: 'facebookName', header: 'Facebook' },
          { key: 'email', header: 'Email' },
          { key: 'createdAt', header: 'Customer since', sortable: true, cell: (c) => fmtDate(c.createdAt) },
        ]}
        empty={<EmptyState icon={Users} title="No customers yet" message="Customers are optional at the POS — add regulars to track their history." action={<Button icon={Plus} onClick={() => setEditing({})}>Add customer</Button>} />}
      />
      <CustomerModal customer={editing} onClose={() => setEditing(null)} onSaved={(c) => !editing?.id && navigate(`/app/customers/${c.id}`)} />
    </>
  )
}

export function CustomerModal({ customer, onClose, onSaved }) {
  const save = useSaveCustomer()
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    values: customer ? { name: '', phone: '', email: '', facebookName: '', notes: '', ...Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, v ?? ''])) } : undefined,
  })
  const submit = handleSubmit((v) => save.mutate({ id: customer.id, ...v, email: v.email || null }, { onSuccess: (d) => { onSaved?.(d); onClose() }, onError: (e) => applyFieldErrors(e, setError) }))
  return (
    <Modal open={!!customer} onClose={onClose} title={customer?.id ? 'Edit customer' : 'Add customer'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save customer</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message} className="sm:col-span-2"><Input {...register('name')} invalid={!!errors.name} /></Field>
        <Field label="Mobile number"><Input type="tel" {...register('phone')} /></Field>
        <Field label="Facebook name"><Input {...register('facebookName')} /></Field>
        <Field label="Email" error={errors.email?.message} className="sm:col-span-2"><Input type="email" {...register('email')} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} {...register('notes')} /></Field>
      </form>
    </Modal>
  )
}
