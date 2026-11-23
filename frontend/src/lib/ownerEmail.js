/**
 * The single owner's email, used behind the scenes so the login screen only asks for a password.
 * Supabase still signs in with email + password; the email just isn't typed.
 * If VITE_OWNER_EMAIL is not set, the login form falls back to asking for the email.
 */
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL || '').trim()

/** j•••••••@gmail.com — enough to recognise the account without displaying it in full. */
export function maskEmail(email) {
  const [user, domain] = String(email).split('@')
  if (!domain) return email
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(3, user.length - 1))}@${domain}`
}
