import { useState } from 'react'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, DataTable, EmptyState, Field, Input, Modal, PageHeader, Segmented, Textarea, Badge } from '@/components/ui'
import { useCategories, useDeleteCategory, useSaveCategory } from '@/features/products'

export default function CategoriesPage() {
  const { data, isLoading } = useCategories()
  const save = useSaveCategory()
  const remove = useDeleteCategory()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    save.mutate(editing, { onSuccess: () => setEditing(null) })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Products', to: '/app/inventory/products' }, { label: 'Categories' }]}
        title="Categories"
        subtitle="Group products and services for filtering and sales-by-category reports."
        actions={<Button icon={Plus} onClick={() => setEditing({ name: '', description: '', kind: 'PRODUCT' })}>Add category</Button>}
      />
      <DataTable
        loading={isLoading}
        rows={data}
        columns={[
          { key: 'name', header: 'Name', cell: (c) => <span className="font-semibold">{c.name}</span> },
          { key: 'kind', header: 'For', cell: (c) => <Badge tone={c.kind === 'SERVICE' ? 'violet' : 'primary'}>{c.kind === 'SERVICE' ? 'Services' : 'Products'}</Badge> },
          { key: 'description', header: 'Description', cell: (c) => <span className="text-muted">{c.description || '—'}</span> },
          { key: 'itemCount', header: 'Items', align: 'right' },
          {
            key: 'a', header: '', align: 'right',
            cell: (c) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4 text-danger" /></Button>
              </div>
            ),
          },
        ]}
        empty={<EmptyState icon={FolderTree} title="No categories yet" action={<Button icon={Plus} onClick={() => setEditing({ name: '', kind: 'PRODUCT' })}>Add category</Button>} />}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit category' : 'Add category'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save category</Button></>}>
        {editing && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name" htmlFor="cat-name" required><Input id="cat-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Used for"><Segmented value={editing.kind} onChange={(kind) => setEditing({ ...editing, kind })} options={[{ value: 'PRODUCT', label: 'Products' }, { value: 'SERVICE', label: 'Services' }]} /></Field>
            <Field label="Description" htmlFor="cat-desc"><Textarea id="cat-desc" rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.name}?`} confirmLabel="Delete category" loading={remove.isPending}
        message="Categories that still have products or services cannot be deleted. Reassign them first."
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })} />
    </>
  )
}
