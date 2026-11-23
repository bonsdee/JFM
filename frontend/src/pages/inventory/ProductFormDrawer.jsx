import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImageOff } from 'lucide-react'
import { Button, Drawer, Field, Input, Select, Textarea, Toggle } from '@/components/ui'
import { FileDrop } from '@/components/shared/FileDrop'
import { useCategories, useSaveProduct } from '@/features/products'
import { useAllSuppliers } from '@/features/purchasing'
import { applyFieldErrors } from '@/features/mutation'
import { UNITS, UNIT_LABEL } from '@/lib/constants'
import { peso } from '@/lib/format'

const money = z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative')
const schema = z.object({
  sku: z.string().trim().max(40).optional(),
  barcode: z.string().trim().max(64).optional(),
  name: z.string().trim().min(2, 'Name is required').max(150),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.enum(UNITS),
  costPrice: money,
  sellingPrice: money,
  reorderLevel: money,
  supplierId: z.string().optional(),
  imagePath: z.string().optional(),
  imageUrl: z.string().optional(),
  location: z.string().max(80).optional(),
  material: z.boolean(),
  initialStock: z.coerce.number().min(0).optional(),
})

const empty = { sku: '', barcode: '', name: '', description: '', categoryId: '', unit: 'PCS', costPrice: 0, sellingPrice: 0, reorderLevel: 10, supplierId: '', imagePath: '', imageUrl: '', location: '', material: false, initialStock: 0 }

/** Create / edit product. Stock is not editable here — it is derived from the ledger. */
export function ProductFormDrawer({ open, onClose, product }) {
  const save = useSaveProduct()
  const { data: categories } = useCategories('PRODUCT')
  const { data: suppliers } = useAllSuppliers()
  const isEdit = !!product?.id
  const { register, handleSubmit, control, reset, watch, setValue, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: empty })

  useEffect(() => {
    if (open) reset(product ? { ...empty, ...Object.fromEntries(Object.entries(product).map(([k, v]) => [k, v ?? ''])) } : empty)
  }, [open, product, reset])

  const [cost, price, imageUrl] = watch(['costPrice', 'sellingPrice', 'imageUrl'])
  const margin = Number(price) > 0 ? ((Number(price) - Number(cost)) / Number(price)) * 100 : null

  const onSubmit = (v) => {
    const body = {
      ...v,
      categoryId: v.categoryId || null,
      supplierId: v.supplierId || null,
      sku: v.sku || null,
      barcode: v.barcode || null,
      initialStock: isEdit ? null : v.initialStock,
    }
    save.mutate(isEdit ? { id: product.id, ...body } : body, { onSuccess: onClose, onError: (e) => applyFieldErrors(e, setError) })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${product.name}` : 'Add product'}
      description={isEdit ? `${product.sku} · stock changes go through Stock In / Out` : 'Retail item or a material used by services'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={handleSubmit(onSubmit)}>{isEdit ? 'Save changes' : 'Add product'}</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Controller control={control} name="material" render={({ field }) => (
          <div className="rounded-2xl border border-line/70 p-4">
            <Toggle checked={field.value} onChange={field.onChange} label="This is a material" description="Consumables used by services (tarp in sq ft, ink in ml). Hidden from the POS product list." />
          </div>
        )} />

        <Field label="Name" htmlFor="p-name" error={errors.name?.message} required>
          <Input id="p-name" invalid={!!errors.name} {...register('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" htmlFor="p-sku" hint={isEdit ? undefined : 'Leave blank to auto-generate'} error={errors.sku?.message}>
            <Input id="p-sku" placeholder="Auto" {...register('sku')} />
          </Field>
          <Field label="Barcode" htmlFor="p-bc" hint="Optional, for scanning at the POS"><Input id="p-bc" {...register('barcode')} /></Field>
          <Field label="Category" htmlFor="p-cat">
            <Select id="p-cat" placeholder="Uncategorized" {...register('categoryId')}>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Unit of measure" htmlFor="p-unit">
            <Select id="p-unit" {...register('unit')}>{UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</Select>
          </Field>
          <Field label="Cost price" htmlFor="p-cost" error={errors.costPrice?.message} hint={isEdit && product.stockOnHand > 0 ? 'Weighted average from stock-ins' : 'Used until the first stock-in'}>
            <Input id="p-cost" type="number" step="0.01" prefix="₱" disabled={isEdit && product.stockOnHand > 0} {...register('costPrice')} />
          </Field>
          <Field label="Selling price" htmlFor="p-price" error={errors.sellingPrice?.message} hint={margin !== null ? `Margin ${margin.toFixed(1)}% · ${peso(price - cost)} per unit` : undefined}>
            <Input id="p-price" type="number" step="0.01" prefix="₱" {...register('sellingPrice')} />
          </Field>
          <Field label="Reorder level" htmlFor="p-rl" hint="Alert when stock falls to this" error={errors.reorderLevel?.message}>
            <Input id="p-rl" type="number" step="0.001" {...register('reorderLevel')} />
          </Field>
          {!isEdit && (
            <Field label="Opening stock" htmlFor="p-init" hint="Posted as an INITIAL movement">
              <Input id="p-init" type="number" step="0.001" {...register('initialStock')} />
            </Field>
          )}
          <Field label="Supplier" htmlFor="p-sup">
            <Select id="p-sup" placeholder="None" {...register('supplierId')}>{suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          </Field>
          <Field label="Location / shelf" htmlFor="p-loc"><Input id="p-loc" placeholder="e.g. Shelf B2" {...register('location')} /></Field>
        </div>
        <Field label="Description" htmlFor="p-desc"><Textarea id="p-desc" rows={2} {...register('description')} /></Field>

        <Field label="Image">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-subtle">
              {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6 text-muted" />}
            </div>
            <FileDrop compact bucket="PRODUCT_IMAGES" folder="products" accept="image/*" maxMb={4} label="Upload image"
              onUploaded={({ path, publicUrl }) => { setValue('imagePath', path); setValue('imageUrl', publicUrl) }} />
          </div>
        </Field>
      </form>
    </Drawer>
  )
}
