import axios from 'axios'
import { supabase } from './supabaseClient'
import { API_BASE, normalizeError as normalize, publicApi } from './publicApi'

export { API_BASE, publicApi }

/** Authenticated client for /api/v1/** — attaches the Supabase access token as a Bearer token. */
export const api = axios.create({ baseURL: `${API_BASE}/api/v1`, timeout: 30000 })


api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let signingOut = false

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.status === 401 && !signingOut) {
      signingOut = true
      await supabase.auth.signOut()
      signingOut = false
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1')
      }
    }
    return Promise.reject(normalize(error))
  },
)

/** Convenience: GET returning data. */
export const get = (url, params) => api.get(url, { params }).then((r) => r.data)
export const post = (url, body, config) => api.post(url, body, config).then((r) => r.data)
export const put = (url, body) => api.put(url, body).then((r) => r.data)
export const patch = (url, body) => api.patch(url, body).then((r) => r.data)
export const del = (url) => api.delete(url).then((r) => r.data)

/** Serialize array params as repeated keys (status=A&status=B) to match Spring. */
api.defaults.paramsSerializer = { indexes: null }
