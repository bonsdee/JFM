import { useState } from 'react'
import { Pencil, Plus, Settings2, Trash2, Wallet } from 'lucide-react'
import { Button, ConfirmDialog, DataTable, DateRangePicker, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Select, Textarea, Badge } from '@/components/ui'
import { useDeleteExpense, useDeleteExpenseCategory, useExpenseCategories, useExpenses, useSaveExpense, useSaveExpenseCategory } from '@/features/expenses'
import { PAYMENT_LABEL, PAYMENT_METHODS } from '@/lib/constants'
import { fmtDate, monthStartISO, peso, todayISO } from '@/lib/format'

export default function ExpensesPage() {
  const [q, setQ] = useState('')
  const [categoryId, setCategory] = useState('')
  const [range, setRange] = useState({ from: monthStartISO(), to: todayISO() })
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [managing, setManaging] = useState(false)
  const { data, isLoading } = useExpenses({ q, categoryId, from: range.from, to: range.to, page })
  const { data: categories } = useExpenseCategories()
  const remove = useDeleteExpense()

  return (
    <>
      <PageHeader title="Expenses" subtitle="Rent, utilities, wages and other costs for net-profit reporting."
        actions={<><Button variant="secondary" icon={Settings2} onClick={() => setManaging(true)}>Categories</Button><Button icon={Plus} onClick={() => setEditing({ expenseDate: todayISO(), paymentMethod: 'CASH' })}>Record expense</Button></>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Search description" className="w-56" />
        <Select value={categoryId} onChange={(e) => { setCategory(e.target.value); setPage(0) }} placeholder="All categories" className="w-48">
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <DateRangePicker value={range} onChange={(r) => { setRange(r); setPage(0) }} />
        <div className="ml-auto rounded-full bg-surface px-4 py-2 text-sm shadow-soft ring-1 ring-line">Total <span className="tabular ml-1 font-bold">{peso(data?.total)}</span></div>
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.page.content}
        page={data?.page}
        onPageChange={setPage}
        columns={[
          { key: 'expenseDate', header: 'Date', cell: (e) => fmtDate(e.expenseDate) },
          { key: 'categoryName', header: 'Category', cell: (e) => <Badge tone="primary" dot={false}>{e.categoryName}</Badge> },
          { key: 'description', header: 'Description', cell: (e) => <div><p className="font-medium">{e.description}</p>{e.notes && <p className="text-xs text-muted">{e.notes}</p>}</div> },
          { key: 'paymentMethod', header: 'Paid via', cell: (e) => PAYMENT_LABEL[e.paymentMethod] || '—' },
          { key: 'amount', header: 'Amount', align: 'right', cell: (e) => <span className="font-semibold">{peso(e.amount)}</span> },
          {
            key: 'a', header: '', align: 'right',
            cell: (e) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(e)} aria-label="Edit expense"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(e)} aria-label="Delete expense"><Trash2 className="h-4 w-4 text-danger" /></Button>
              </div>
            ),
          },
        ]}
        empty={<EmptyState icon={Wallet} title="No expenses in this period" action={<Button icon={Plus} onClick={() => setEditing({ expenseDate: todayISO(), paymentMethod: 'CASH' })}>Record expense</Button>} />}
      />
      <ExpenseModal expense={editing} categories={categories} onClose={() => setEditing(null)} />
      <CategoryManager open={managing} onClose={() => setManaging(false)} categories={categories} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this expense?" confirmLabel="Delete expense" loading={remove.isPending}
        message={deleting && `${deleting.description} — ${peso(deleting.amount)}. This changes your profit & loss.`}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })} />
    </>
  )
}

function ExpenseModal({ expense, categories, onClose }) {
  const save = useSaveExpense()
  const [f, setF] = useState(null)
  const cur = f && f._src === expense ? f : expense ? { _src: expense, categoryId: expense.categoryId || categories?.[0]?.id || '', description: expense.description || '', amount: expense.amount || '', expenseDate: expense.expenseDate, paymentMethod: expense.paymentMethod || 'CASH', notes: expense.notes || '' } : null
  const set = (patch) => setF({ ...cur, ...patch })
  const valid = cur && cur.categoryId && cur.description.trim() && Number(cur.amount) > 0 && cur.expenseDate
  const submit = () => save.mutate({ id: expense.id, categoryId: cur.categoryId, description: cur.description, amount: Number(cur.amount), expenseDate: cur.expenseDate, paymentMethod: cur.paymentMethod || null, notes: cur.notes || null }, { onSuccess: () => { setF(null); onClose() } })
  return (
    <Modal open={!!expense} onClose={() => { setF(null); onClose() }} title={expense?.id ? 'Edit expense' : 'Record expense'}
      footer={<Button disabled={!valid} loading={save.isPending} onClick={submit}>Save expense</Button>}>
      {cur && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><Select value={cur.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={cur.expenseDate} onChange={(e) => set({ expenseDate: e.target.value })} /></Field>
          <Field label="Description" className="sm:col-span-2"><Input value={cur.description} onChange={(e) => set({ description: e.target.value })} placeholder="e.g. November electric bill" /></Field>
          <Field label="Amount"><Input type="number" min="0" step="0.01" prefix="₱" value={cur.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>
          <Field label="Paid via"><Select value={cur.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })} options={PAYMENT_METHODS} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={cur.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        </div>
      )}
    </Modal>
  )
}

function CategoryManager({ open, onClose, categories }) {
  const save = useSaveExpenseCategory()
  const remove = useDeleteExpenseCategory()
  const [name, setName] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Expense categories" size="sm">
      <ul className="mb-4 divide-y divide-line/60">
        {categories?.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
            <span>{c.name} <span className="text-xs text-muted">· {c.expenseCount} entries</span></span>
            <Button variant="ghost" size="icon-sm" disabled={c.expenseCount > 0} onClick={() => remove.mutate(c.id)} aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save.mutate({ name }, { onSuccess: () => setName('') }) }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" />
        <Button type="submit" loading={save.isPending} icon={Plus}>Add</Button>
      </form>
    </Modal>
  )
}
