import axios from 'axios'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

/** Shapes axios errors into { message, status, code, fieldErrors } for the UI. */
export function normalizeError(error) {
  const data = error?.response?.data
  const message =
    (data && typeof data === 'object' && !(data instanceof Blob) && data.message) ||
    (error.code === 'ECONNABORTED' ? 'The server took too long to respond. Try again.' : null) ||
    (!error.response ? 'Cannot reach the server. Check your connection.' : 'Something went wrong. Try again.')
  error.message = message
  error.status = error?.response?.status
  error.code = (data && data.code) || error.code
  error.fieldErrors = (data && data.fieldErrors) || []
  return error
}

/** Anonymous client for /api/public/** (landing page). Kept free of Supabase so the landing bundle stays small. */
export const publicApi = axios.create({ baseURL: `${API_BASE}/api/public`, timeout: 15000 })
publicApi.interceptors.response.use((r) => r, (e) => Promise.reject(normalizeError(e)))
