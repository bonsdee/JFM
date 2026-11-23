import { api } from './api'
import { supabase } from './supabaseClient'

/**
 * Fetches an authenticated file (PDF/XLSX/CSV/ZIP) and either opens it in a new tab or downloads it.
 * Needed because <a href> cannot send the Bearer token.
 */
export async function fetchFile(url, { params, download = true, fallbackName = 'download' } = {}) {
  const res = await api.get(url, { params, responseType: 'blob' })
  const disposition = res.headers['content-disposition'] || ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  const name = match ? decodeURIComponent(match[1]) : fallbackName
  const blobUrl = URL.createObjectURL(res.data)
  if (download) {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  } else {
    window.open(blobUrl, '_blank', 'noopener')
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

/**
 * Uploads a file to Supabase Storage using a backend-issued signed URL (service key never leaves the server).
 * @param {'PRODUCT_IMAGES'|'JOB_FILES'|'BUSINESS_ASSETS'} bucketKind
 */
export async function uploadFile(bucketKind, file, folder = '') {
  const { data } = await api.post('/storage/upload-url', { bucket: bucketKind, fileName: file.name, folder })
  const { error } = await supabase.storage.from(data.bucket).uploadToSignedUrl(data.path, data.token, file, {
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(error.message || 'Upload failed')
  return { path: data.path, publicUrl: data.publicUrl, bucket: data.bucket }
}
