import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Archive, Boxes, Download, FolderTree, MoreHorizontal, Pencil, Plus, RotateCcw, Upload } from 'lucide-react'
import { Badge, Button, DataTable, Dropdown, EmptyState, Modal, PageHeader, SearchInput, Select, StatusBadge, Tabs } from '@/components/ui'
import { ProductFormDrawer } from './ProductFormDrawer'
import { useArchiveProduct, useCategories, useImportProducts, useProducts } from '@/features/products'
import { fetchFile } from '@/lib/files'
import { UNIT_LABEL } from '@/lib/constants'
import { num, peso } from '@/lib/format'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('name,asc')
  const [editing, setEditing] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const tab = params.get('tab') || 'all'
  const categoryId = params.get('category') || ''
  const status = params.get('status') || ''

  const { data: categories } = useCategories('PRODUCT')
  const { data, isLoading } = useProducts({
    q, page, size: 20, sort, categoryId, status,
    material: tab === 'retail' ? false : tab === 'materials' ? true : undefined,
    archived: tab === 'archived',
  })
  const archive = useArchiveProduct()

  const setFilter = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n); setPage(0) }

  const columns = [
    {
      key: 'name', header: 'Product', sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-subtle">
            {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Boxes className="m-2.5 h-5 w-5 text-muted" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="text-xs text-muted">{p.sku}{p.material && ' · material'}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (p) => p.categoryName || <span className="text-muted">—</span> },
    { key: 'stockOnHand', header: 'On hand', sortable: true, align: 'right', cell: (p) => <span className="font-semibold">{num(p.stockOnHand)} <span className="text-xs font-normal text-muted">{UNIT_LABEL[p.unit]}</span></span> },
    { key: 'status', header: 'Stock', cell: (p) => <StatusBadge kind="stock" status={p.stockStatus} /> },
    { key: 'costPrice', header: 'Avg cost', sortable: true, align: 'right', cell: (p) => peso(p.costPrice) },
    { key: 'sellingPrice', header: 'Price', sortable: true, align: 'right', cell: (p) => (p.material ? <span className="text-muted">—</span> : peso(p.sellingPrice)) },
    { key: 'value', header: 'Stock value', align: 'right', cell: (p) => peso(p.stockValue) },
    {
      key: 'actions', header: '', align: 'right',
      cell: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={({ toggle }) => <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={`Actions for ${p.name}`}><MoreHorizontal className="h-4 w-4" /></Button>}
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => setEditing(p) },
              { label: 'Stock in', icon: Plus, onClick: () => navigate(`/app/stock/in?product=${p.id}`) },
              p.archived
                ? { label: 'Restore', icon: RotateCcw, onClick: () => archive.mutate({ id: p.id, archived: false }) }
                : { label: 'Archive', icon: Archive, danger: true, onClick: () => archive.mutate({ id: p.id, archived: true }) },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Retail items and the materials your services consume."
        actions={
          <>
            <Link to="/app/inventory/categories"><Button variant="secondary" icon={FolderTree}>Categories</Button></Link>
            <Dropdown
              trigger={({ toggle }) => <Button variant="secondary" icon={Download} onClick={toggle}>Export</Button>}
              items={[
                { label: 'Excel (.xlsx)', onClick: () => fetchFile('/products/export', { params: { format: 'XLSX' } }).catch((e) => toast.error(e.message)) },
                { label: 'CSV', onClick: () => fetchFile('/products/export', { params: { format: 'CSV' } }).catch((e) => toast.error(e.message)) },
                { label: 'PDF', onClick: () => fetchFile('/products/export', { params: { format: 'PDF' } }).catch((e) => toast.error(e.message)) },
              ]}
            />
            <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import</Button>
            <Button icon={Plus} onClick={() => setEditing({})}>Add product</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={(v) => setFilter('tab', v === 'all' ? '' : v)} tabs={[
          { value: 'all', label: 'All' }, { value: 'retail', label: 'Retail' }, { value: 'materials', label: 'Materials' }, { value: 'archived', label: 'Archived' },
        ]} />
        <div className="flex flex-wrap gap-2">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Search name, SKU or barcode" className="w-64" />
          <Select value={categoryId} onChange={(e) => setFilter('category', e.target.value)} className="w-44" placeholder="All categories">
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setFilter('status', e.target.value)} className="w-40" placeholder="Any stock level">
            <option value="IN_STOCK">In stock</option><option value="LOW">Low</option><option value="OUT">Out of stock</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.content}
        loading={isLoading}
        sort={sort}
        onSort={setSort}
        page={data}
        onPageChange={setPage}
        onRowClick={(p) => navigate(`/app/inventory/products/${p.id}`)}
        empty={<EmptyState icon={Boxes} title={q ? 'No products match your search' : 'No products yet'} message={q ? 'Try a different name or SKU.' : 'Add your first product or import a CSV.'} action={!q && <Button icon={Plus} onClick={() => setEditing({})}>Add product</Button>} />}
      />

      <ProductFormDrawer open={!!editing} product={editing?.id ? editing : null} onClose={() => setEditing(null)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}

function ImportDialog({ open, onClose }) {
  const imp = useImportProducts()
  const [file, setFile] = useState(null)
  const result = imp.data
  const template = 'sku,name,category,unit,cost_price,selling_price,reorder_level,initial_stock,barcode,location,is_material\n,Sample Pen,School Supplies,PCS,6,10,20,100,,Counter,false\n'

  return (
    <Modal open={open} onClose={() => { imp.reset(); setFile(null); onClose() }} title="Import products from CSV" description="Existing SKUs are skipped. New categories are created automatically."
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button disabled={!file} loading={imp.isPending} onClick={() => imp.mutate(file)}>Import</Button></>}>
      <div className="space-y-4">
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="products-template.csv" className="text-sm font-semibold text-primary hover:underline">Download template</a>
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:font-semibold file:text-primary-700" />
        {result && (
          <div className="rounded-2xl bg-subtle p-4 text-sm">
            <div className="flex gap-2"><Badge tone="success">{result.created} created</Badge><Badge>{result.skipped} skipped</Badge>{result.errors.length > 0 && <Badge tone="danger">{result.errors.length} errors</Badge>}</div>
            {result.errors.length > 0 && <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-danger">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          </div>
        )}
      </div>
    </Modal>
  )
}
