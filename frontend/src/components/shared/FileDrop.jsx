import { useRef, useState } from 'react'
import { Loader2, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadFile } from '@/lib/files'
import { cn } from '@/lib/cn'

/**
 * Drag & drop / click uploader to Supabase Storage via backend-signed URLs.
 * onUploaded({ path, publicUrl, file }) is called per file.
 */
export function FileDrop({ bucket, folder, accept, multiple = false, maxMb = 10, onUploaded, label = 'Drop a file or click to upload', className, compact }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  const handle = async (files) => {
    const list = [...files]
    if (!list.length) return
    setBusy(true)
    try {
      for (const file of list) {
        if (file.size > maxMb * 1024 * 1024) { toast.error(`${file.name} is larger than ${maxMb} MB`); continue }
        const res = await uploadFile(bucket, file, folder)
        await onUploaded?.({ ...res, file })
      }
    } catch (e) {
      toast.error(e.message || 'Upload failed. Check that Supabase Storage is configured.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files) }}
      disabled={busy}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center text-sm transition',
        compact ? 'px-4 py-4' : 'px-6 py-8',
        over ? 'border-primary bg-primary-50/60 dark:bg-primary/10' : 'border-line hover:border-primary/50 hover:bg-subtle',
        className,
      )}
    >
      {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-primary" />}
      <span className="font-medium text-ink">{busy ? 'Uploading…' : label}</span>
      <span className="text-xs text-muted">Up to {maxMb} MB</span>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => handle(e.target.files)} />
    </button>
  )
}
