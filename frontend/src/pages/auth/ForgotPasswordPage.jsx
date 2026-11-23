import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Field, Input } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabaseClient'
import { OWNER_EMAIL, maskEmail } from '@/lib/ownerEmail'

const schema = z.object({ email: z.string().trim().email('Enter your email') })

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const send = async (email) => {
    setError('')
    setSending(true)
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    setSending(false)
    if (e) setError(e.message)
    else setSentTo(OWNER_EMAIL ? maskEmail(email) : email)
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" subtitle={`A reset link is on its way to ${sentTo}.`}>
        <div className="flex items-center gap-3 rounded-2xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success/15 dark:text-emerald-300">
          <MailCheck className="h-5 w-5 shrink-0" /> The link opens a page where you can choose a new password.
        </div>
        <Link to="/login"><Button variant="secondary" className="mt-6 w-full">Back to sign in</Button></Link>
      </AuthShell>
    )
  }

  // Password-only mode: the owner email is known, so there is nothing to type.
  if (OWNER_EMAIL) {
    return (
      <AuthShell title="Reset your password" subtitle={`We'll email a secure link to the owner account (${maskEmail(OWNER_EMAIL)}).`}>
        {error && <p role="alert" className="mb-4 text-sm font-medium text-danger">{error}</p>}
        <Button size="lg" className="w-full" loading={sending} onClick={() => send(OWNER_EMAIL)}>Email me a reset link</Button>
        <p className="mt-6 text-center text-sm text-muted">Remembered it? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email a secure link to the owner account.">
      <form onSubmit={handleSubmit(({ email }) => send(email))} noValidate className="space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </Field>
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={sending}>Send reset link</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Remembered it? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
    </AuthShell>
  )
}
