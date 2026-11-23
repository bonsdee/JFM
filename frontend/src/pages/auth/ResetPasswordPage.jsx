import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { AuthShell } from './AuthShell'
import { Field, Input } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabaseClient'

export const passwordSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters').regex(/[0-9]/, 'Include at least one number'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

/** Landing point of the Supabase recovery email (session is created from the URL hash). */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    supabase.auth.getSession().then(({ data: d }) => d.session && setReady(true))
    return () => data.subscription.unsubscribe()
  }, [])

  const onSubmit = async ({ password }) => {
    setError('')
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) { setError(e.message); return }
    toast.success('Password updated')
    navigate('/app', { replace: true })
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You'll stay signed in on this device.">
      {!ready ? (
        <div className="space-y-4 text-sm text-muted">
          <p>Verifying your reset link… If this takes long, the link may have expired.</p>
          <Link to="/forgot-password"><Button variant="secondary" className="w-full">Request a new link</Button></Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="New password" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
            <Input id="confirm" type="password" autoComplete="new-password" invalid={!!errors.confirm} {...register('confirm')} />
          </Field>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Update password</Button>
        </form>
      )}
    </AuthShell>
  )
}
