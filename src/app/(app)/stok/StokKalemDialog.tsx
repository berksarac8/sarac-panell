'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createStokKalem, updateStokKalem, deleteStokKalem } from '@/lib/actions/stok'
import type {
  StokKalem,
  StokKalemOzet,
  StokKategori,
  StokBirim,
} from '@/types/stok'
import { STOK_KATEGORI_LABEL, STOK_BIRIM_LABEL } from '@/types/stok'

type Props = {
  trigger?: React.ReactNode
  duzenle?: StokKalemOzet | null
  defaultOpen?: boolean
  onClose?: () => void
  /** Yeni kalem eklendiğinde parent'a haber ver (Hareket dialog'unda kullanılıyor). */
  onCreated?: (kalem: StokKalem) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const KATEGORI_OPTIONS: StokKategori[] = ['yem', 'ilac', 'malzeme', 'diger']
const BIRIM_OPTIONS: StokBirim[] = ['kg', 'litre', 'adet', 'paket']

export function StokKalemDialog({
  trigger,
  duzenle = null,
  defaultOpen = false,
  onClose,
  onCreated,
  open: openProp,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = openProp ?? internalOpen
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v)
    if (openProp === undefined) setInternalOpen(v)
  }
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const [isim, setIsim] = useState(duzenle?.isim ?? '')
  const [kategori, setKategori] = useState<StokKategori>(duzenle?.kategori ?? 'yem')
  const [birim, setBirim] = useState<StokBirim>(duzenle?.birim ?? 'kg')
  const [notlar, setNotlar] = useState(duzenle?.notlar ?? '')

  function submit(formData: FormData) {
    setHata(null)
    formData.set('isim', isim)
    formData.set('kategori', kategori)
    formData.set('birim', birim)
    formData.set('notlar', notlar)

    startTransition(async () => {
      if (duzenle) {
        const res = await updateStokKalem(duzenle.id, formData)
        if ('error' in res && res.error) {
          setHata(res.error)
          return
        }
      } else {
        const res = await createStokKalem(formData)
        if ('error' in res && res.error) {
          setHata(res.error)
          return
        }
        if ('data' in res && res.data && onCreated) onCreated(res.data)
      }
      setOpen(false)
      onClose?.()
    })
  }

  function sil() {
    if (!duzenle) return
    if (!confirm('Bu stok kalemini silmek istediğine emin misin?')) return
    startTransition(async () => {
      const res = await deleteStokKalem(duzenle.id)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setOpen(false)
      onClose?.()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) onClose?.()
      }}
    >
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{duzenle ? 'Stok Kalemini Düzenle' : 'Yeni Stok Kalemi'}</DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <Field label="İsim">
            <input
              required
              value={isim}
              onChange={(e) => setIsim(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="örn. Banvit Civciv Yemi"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Kategori">
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as StokKategori)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                {KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {STOK_KATEGORI_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Birim">
              <select
                value={birim}
                onChange={(e) => setBirim(e.target.value as StokBirim)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                {BIRIM_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {STOK_BIRIM_LABEL[b]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notlar">
            <textarea
              value={notlar ?? ''}
              onChange={(e) => setNotlar(e.target.value)}
              rows={2}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          {hata && <p className="text-sm text-rose-600">{hata}</p>}

          <div className="flex justify-between gap-2 pt-2">
            <div>
              {duzenle && (
                <button
                  type="button"
                  onClick={sil}
                  disabled={pending}
                  className="text-sm px-3 py-1.5 border border-rose-300 text-rose-700 rounded"
                >
                  Sil
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-1.5 border rounded"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={pending}
                className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                {pending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}
