import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { DatabaseBackup, ImageOff, KeyRound, LogOut, Monitor } from 'lucide-react'
import { Button, Card, CardHeader, DescriptionList, Field, Input, PageHeader, Skeleton, Tabs, Textarea, Toggle } from '@/components/ui'
import { FileDrop } from '@/components/shared/FileDrop'
import { WebsiteContentEditor } from './WebsiteContentEditor'
import { useSaveSettings, useSettings } from '@/features/admin'
import { passwordSchema } from '@/pages/auth/ResetPasswordPage'
import { supabase } from '@/lib/supabaseClient'
import { signOut, useAuthStore } from '@/stores/authStore'
import { fetchFile } from '@/lib/files'
import { fmtDateTime } from '@/lib/format'

const TABS = [
  { value: 'business', label: 'Business profile' },
  { value: 'receipt', label: 'Receipt & tax' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'website', label: 'Website content' },
  { value: 'account', label: 'Account' },
  { value: 'backup', label: 'Backup' },
]

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'business'
  const { data: settings, isLoading } = useSettings()
  const save = useSaveSettings()
  const [f, setF] = useState(null)
  useEffect(() => { if (settings) setF(settings) }, [settings])
  const set = (patch) => setF((p) => ({ ...p, ...patch }))
  const submit = () => save.mutate({
    ...f, vatRate: Number(f.vatRate) || 0, defaultReorderLevel: Number(f.defaultReorderLevel) || 0,
    email: f.email || null, tin: f.tin || null,
  })

  return (
    <>
      <PageHeader title="Settings" subtitle="Business details, policies, website content and your account." />
      <Tabs className="mb-5" value={tab} onChange={(v) => setParams({ tab: v })} tabs={TABS} />

      {['business', 'receipt', 'inventory'].includes(tab) && (isLoading || !f ? <Skeleton className="h-96 rounded-card" /> : (
        <Card>
          {tab === 'business' && (
            <>
              <CardHeader title="Business profile" subtitle="Shown on receipts, POs, job tickets and the website." />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Logo" className="sm:col-span-2">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-subtle">{f.logoUrl ? <img src={f.logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <ImageOff className="h-6 w-6 text-muted" />}</div>
                    <FileDrop compact bucket="BUSINESS_ASSETS" folder="branding" accept="image/*" maxMb={2} label="Upload logo" onUploaded={({ path, publicUrl }) => set({ logoPath: path, logoUrl: publicUrl })} />
                  </div>
                </Field>
                <Field label="Business name" required><Input value={f.businessName} onChange={(e) => set({ businessName: e.target.value })} /></Field>
                <Field label="Tagline"><Input value={f.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} /></Field>
                <Field label="Address" className="sm:col-span-2"><Input value={f.address || ''} onChange={(e) => set({ address: e.target.value })} /></Field>
                <Field label="Phone"><Input value={f.phone || ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={f.email || ''} onChange={(e) => set({ email: e.target.value })} /></Field>
                <Field label="TIN" hint="Optional"><Input value={f.tin || ''} onChange={(e) => set({ tin: e.target.value })} /></Field>
                <Field label="Facebook page"><Input value={f.facebookUrl || ''} onChange={(e) => set({ facebookUrl: e.target.value })} /></Field>
              </div>
            </>
          )}
          {tab === 'receipt' && (
            <>
              <CardHeader title="Receipt & tax" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Receipt header" hint="First line prints bold"><Textarea rows={3} value={f.receiptHeader || ''} onChange={(e) => set({ receiptHeader: e.target.value })} /></Field>
                <Field label="Receipt footer"><Textarea rows={3} value={f.receiptFooter || ''} onChange={(e) => set({ receiptFooter: e.target.value })} /></Field>
                <div className="space-y-4 rounded-2xl border border-line/70 p-4 sm:col-span-2">
                  <Toggle checked={f.vatEnabled} onChange={(v) => set({ vatEnabled: v })} label="Charge VAT" description="Off for non-VAT registered businesses" />
                  {f.vatEnabled && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="VAT rate"><Input type="number" step="0.01" suffix="%" value={f.vatRate} onChange={(e) => set({ vatRate: e.target.value })} /></Field>
                      <Toggle checked={f.vatInclusive} onChange={(v) => set({ vatInclusive: v })} label="Prices include VAT" description="When off, VAT is added on top at checkout" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {tab === 'inventory' && (
            <>
              <CardHeader title="Inventory policy" />
              <div className="space-y-5 p-5">
                <Field label="Default reorder level" hint="Used for new products when none is entered" className="max-w-xs"><Input type="number" step="0.001" value={f.defaultReorderLevel} onChange={(e) => set({ defaultReorderLevel: e.target.value })} /></Field>
                <Toggle checked={f.allowNegativeStock} onChange={(v) => set({ allowNegativeStock: v })} label="Allow negative stock"
                  description="When off (recommended), sales and job consumption are blocked if stock would drop below zero." />
              </div>
            </>
          )}
          <div className="flex justify-end border-t border-line px-5 py-4"><Button loading={save.isPending} onClick={submit}>Save settings</Button></div>
        </Card>
      ))}

      {tab === 'website' && <WebsiteContentEditor />}
      {tab === 'account' && <AccountSettings />}
      {tab === 'backup' && <BackupSettings />}
    </>
  )
}

function AccountSettings() {
  const { session, user } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(passwordSchema) })
  const change = async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) toast.error(error.message)
    else { toast.success('Password changed'); reset() }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Change password" />
        <form onSubmit={handleSubmit(change)} className="space-y-4 p-5" noValidate>
          <Field label="New password" error={errors.password?.message}><Input type="password" autoComplete="new-password" {...register('password')} /></Field>
          <Field label="Confirm password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" {...register('confirm')} /></Field>
          <Button type="submit" icon={KeyRound} loading={isSubmitting}>Change password</Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Active session" />
        <div className="space-y-5 p-5">
          <div className="flex items-center gap-3 rounded-2xl bg-subtle p-4">
            <Monitor className="h-5 w-5 text-primary" />
            <div className="min-w-0 text-sm"><p className="font-semibold">This device</p><p className="truncate text-xs text-muted">{navigator.userAgent}</p></div>
          </div>
          <DescriptionList items={[
            { label: 'Signed in as', value: user?.email },
            { label: 'Last sign-in', value: fmtDateTime(user?.last_sign_in_at) },
            { label: 'Session expires', value: session?.expires_at ? `${fmtDateTime(session.expires_at * 1000)} (auto-refreshes)` : '—' },
            { label: 'Owner ID', value: <span className="font-mono text-xs">{user?.id}</span> },
          ]} />
          <Button variant="danger-soft" icon={LogOut} onClick={async () => { await signOut(); navigate('/login') }}>Sign out</Button>
        </div>
      </Card>
    </div>
  )
}

function BackupSettings() {
  const [busy, setBusy] = useState(false)
  return (
    <Card>
      <CardHeader title="Data backup" subtitle="Download every table as CSV in one zip file. Keep a copy somewhere safe each month." />
      <div className="p-5">
        <Button icon={DatabaseBackup} loading={busy} onClick={async () => {
          setBusy(true)
          try { await fetchFile('/backup/export'); toast.success('Backup downloaded') } catch (e) { toast.error(e.message) } finally { setBusy(false) }
        }}>Download backup (.zip)</Button>
        <p className="mt-3 text-xs text-muted">Includes products, stock ledger, sales, job orders, purchases, expenses, customers, settings and audit log.</p>
      </div>
    </Card>
  )
}
