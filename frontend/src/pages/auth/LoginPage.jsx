import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Field, Input } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { supabase, supabaseConfigured, setRememberMe } from '@/lib/supabaseClient'
import { api } from '@/lib/api'
import { OWNER_EMAIL } from '@/lib/ownerEmail'
import { GuestOnly } from '@/app/ProtectedRoute'

const passwordOnly = Boolean(OWNER_EMAIL)

const schema = z.object({
  email: passwordOnly ? z.string().optional() : z.string().trim().email('Enter the owner email'),
  password: z.string().min(6, 'Password is at least 6 characters'),
  remember: z.boolean(),
})

export default function LoginGate() {
  return <GuestOnly><LoginPage /></GuestOnly>
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [error, setError] = useState(params.get('expired') ? 'Your session expired. Sign in again.' : '')
  const [show, setShow] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: OWNER_EMAIL, password: '', remember: true },
  })

  const onSubmit = async ({ email, password, remember }) => {
    setError('')
    setRememberMe(remember)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: passwordOnly ? OWNER_EMAIL : email,
      password,
    })
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? (passwordOnly ? 'Wrong password. Try again.' : 'Email or password is incorrect.')
        : authError.message)
      return
    }
    // Confirm this account is the configured owner before entering the dashboard.
    try {
      await api.get('/settings')
    } catch (e) {
      if (e.status === 403) {
        await supabase.auth.signOut()
        setError('This account is not the business owner. Access is limited to the owner account.')
        return
      }
      // Backend unreachable: still allow entry; pages will show their own errors.
    }
    navigate(location.state?.from || '/app', { replace: true })
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={passwordOnly ? 'Enter your password to open the dashboard.' : 'Sign in to manage sales, stock and job orders.'}
    >
      {!supabaseConfigured && (
        <p className="mb-5 rounded-2xl bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {passwordOnly ? (
          // Hidden username so password managers / iCloud Keychain still save and fill the right account.
          <input type="email" name="username" autoComplete="username" value={OWNER_EMAIL} readOnly hidden />
        ) : (
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="username" invalid={!!errors.email} {...register('email')} />
          </Field>
        )}
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          aside={<Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link>}
        >
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus={passwordOnly}
              className="pr-11"
              invalid={!!errors.password}
              {...register('password')}
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 rounded border-line accent-[#6366F1]" {...register('remember')} />
          Remember me on this device
        </label>
        {error && <p role="alert" className="rounded-2xl bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700 dark:bg-danger/15 dark:text-red-300">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={LogIn}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-xs text-muted">This dashboard is for the shop owner only. There is no public sign-up.</p>
    </AuthShell>
  )
}
