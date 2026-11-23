import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Clock, Facebook, Mail, MapPin, Phone, Send } from 'lucide-react'
import { SectionHeading } from './Sections'
import { useSendInquiry } from '@/features/publicSite'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  serviceInterest: z.string().optional(),
  message: z.string().trim().min(5, 'Tell us a bit about what you need').max(3000),
  website: z.string().max(0).optional(), // honeypot
}).refine((d) => d.email || d.phone, { message: 'Add an email or phone so we can reply', path: ['phone'] })

export function Contact({ contact = {}, services = [], heading = {} }) {
  const send = useSendInquiry()
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', serviceInterest: '', message: '', website: '' },
  })

  // Prefill from the tarp estimator.
  useEffect(() => {
    const onPrefill = (e) => {
      setSent(false)
      setValue('serviceInterest', e.detail.service)
      setValue('message', e.detail.message)
    }
    window.addEventListener('jfm-prefill', onPrefill)
    return () => window.removeEventListener('jfm-prefill', onPrefill)
  }, [setValue])

  const onSubmit = (values) =>
    send.mutate({ ...values, subject: values.serviceInterest ? `Inquiry: ${values.serviceInterest}` : 'Website inquiry' }, {
      onSuccess: () => { setSent(true); reset() },
    })

  const rows = [
    contact.address && { icon: MapPin, label: contact.address },
    contact.phone && { icon: Phone, label: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
    contact.email && { icon: Mail, label: contact.email, href: `mailto:${contact.email}` },
    contact.facebook && { icon: Facebook, label: 'Message us on Facebook', href: contact.facebook },
  ].filter(Boolean)

  return (
    <section id="contact" className="scroll-mt-24 bg-surface py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2">
        <div>
          <SectionHeading title={heading.title} subtitle={heading.subtitle} />
          <ul className="mt-8 space-y-3">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center gap-3 text-[15px]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary dark:bg-primary/15"><r.icon className="h-4 w-4" /></span>
                {r.href ? <a href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="hover:text-primary">{r.label}</a> : <span>{r.label}</span>}
              </li>
            ))}
          </ul>
          {contact.hours?.length > 0 && (
            <div className="mt-8 rounded-[24px] border border-line/70 p-5">
              <p className="mb-3 flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-accent" /> Shop hours</p>
              <dl className="space-y-1.5 text-sm">
                {contact.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4"><dt className="text-muted">{h.days}</dt><dd className="tabular font-medium">{h.time}</dd></div>
                ))}
              </dl>
            </div>
          )}
          {contact.mapEmbedUrl && (
            <div className="mt-6 aspect-[16/9] overflow-hidden rounded-[24px] border border-line/70 bg-subtle">
              <iframe title="Shop location map" src={contact.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-full w-full border-0" />
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-line/70 bg-bg p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success">
                  <CheckCircle2 className="h-8 w-8" />
                </motion.span>
                <h3 className="mt-5 text-xl font-bold">Message sent</h3>
                <p className="mt-2 max-w-xs text-muted">We'll get back to you shortly — usually within the hour during shop hours.</p>
                <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>Send another message</Button>
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <Field label="Your name" htmlFor="c-name" error={errors.name?.message} required>
                  <Input id="c-name" autoComplete="name" invalid={!!errors.name} {...register('name')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" htmlFor="c-email" error={errors.email?.message}>
                    <Input id="c-email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
                  </Field>
                  <Field label="Mobile number" htmlFor="c-phone" error={errors.phone?.message}>
                    <Input id="c-phone" type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" invalid={!!errors.phone} {...register('phone')} />
                  </Field>
                </div>
                <Field label="What do you need?" htmlFor="c-service">
                  <Select id="c-service" placeholder="Choose a service" {...register('serviceInterest')}>
                    {services.map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}
                    <option value="Other">Something else</option>
                  </Select>
                </Field>
                <Field label="Details" htmlFor="c-msg" error={errors.message?.message} required>
                  <Textarea id="c-msg" rows={5} placeholder="Size, quantity, when you need it…" invalid={!!errors.message} {...register('message')} />
                </Field>
                <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...register('website')} />
                {send.isError && <p role="alert" className="text-sm font-medium text-danger">{send.error.status === 429 ? 'Too many messages from this device. Try again in an hour or message us on Facebook.' : send.error.message}</p>}
                <Button type="submit" size="lg" className="w-full" loading={send.isPending} icon={Send}>Send message</Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
