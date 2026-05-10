'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { addOlum, updateOlum } from '@/lib/actions/suru'
import type { SuruOlum } from '@/types/suru'

type Props = {
  donemId: string
  trigger: React.ReactElement
  duzenle?: SuruOlum | null
}

export function OlumDialog({ donemId, trigger, duzenle = null }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [tarih, setTarih] = useState(duzenle?.tarih ?? today)
  const [blokNo, setBlokNo] = useState<string>(
    duzenle?.blok_no != null ? String(duzenle.blok_no) : ''
  )
  const [adet, setAdet] = useState(duzenle ? String(duzenle.adet) : '')
  const [sebep, setSebep] = useState(duzenle?.sebep ?? '')

  function submit(formData: FormData) {
    setHata(null)
    formData.set('tarih', tarih)
    formData.set('blok_no', blokNo)
    formData.set('adet', adet)
    formData.set('sebep', sebep)

    startTransition(async () => {
      const res = duzenle
        ? await updateOlum(duzenle.id, formData)
        : await addOlum(donemId, formData)
      if (res.error) {
        setHata(res.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{duzenle ? 'Ölüm Kaydını Düzenle' : 'Yeni Ölüm Kaydı'}</DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <Field label="Tarih">
            <input
              required
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Blok">
            <select
              value={blokNo}
              onChange={(e) => setBlokNo(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">Genel (blok belirtme)</option>
              <option value="1">Blok 1</option>
              <option value="2">Blok 2</option>
              <option value="3">Blok 3</option>
            </select>
          </Field>

          <Field label="Adet">
            <input
              required
              inputMode="numeric"
              value={adet}
              onChange={(e) => setAdet(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="0"
            />
          </Field>

          <Field label="Sebep (opsiyonel)">
            <input
              value={sebep}
              onChange={(e) => setSebep(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="örn. ezilme, hastalık"
            />
          </Field>

          {hata && <p className="text-sm text-rose-600">{hata}</p>}

          <div className="flex justify-end gap-2 pt-2">
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
