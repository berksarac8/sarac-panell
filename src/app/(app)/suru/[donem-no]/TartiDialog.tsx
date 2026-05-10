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
import { addTarti, updateTarti } from '@/lib/actions/suru'
import type { SuruTarti } from '@/types/suru'

type Props = {
  donemId: string
  trigger: React.ReactElement
  duzenle?: SuruTarti | null
}

export function TartiDialog({ donemId, trigger, duzenle = null }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [tarih, setTarih] = useState(duzenle?.tarih ?? today)
  const [blokNo, setBlokNo] = useState<string>(
    duzenle?.blok_no != null ? String(duzenle.blok_no) : ''
  )
  const [tartilanAdet, setTartilanAdet] = useState(
    duzenle ? String(duzenle.tartilan_adet) : ''
  )
  const [ortKg, setOrtKg] = useState(duzenle ? String(duzenle.ortalama_kg) : '')

  function submit(formData: FormData) {
    setHata(null)
    formData.set('tarih', tarih)
    formData.set('blok_no', blokNo)
    formData.set('tartilan_adet', tartilanAdet)
    formData.set('ortalama_kg', ortKg)

    startTransition(async () => {
      const res = duzenle
        ? await updateTarti(duzenle.id, formData)
        : await addTarti(donemId, formData)
      if ('error' in res && res.error) {
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
          <DialogTitle>{duzenle ? 'Tartıyı Düzenle' : 'Yeni Tartı'}</DialogTitle>
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

          <Field label="Tartılan adet">
            <input
              required
              inputMode="numeric"
              value={tartilanAdet}
              onChange={(e) => setTartilanAdet(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="0"
            />
          </Field>

          <Field label="Ortalama kg">
            <input
              required
              inputMode="decimal"
              value={ortKg}
              onChange={(e) => setOrtKg(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="0.00"
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
