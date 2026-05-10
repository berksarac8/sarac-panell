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
import { addYem, updateYem } from '@/lib/actions/suru'
import type { SuruYem, YemTipi } from '@/types/suru'
import { YEM_TIPI_LABEL } from '@/types/suru'

type Props = {
  donemId: string
  trigger: React.ReactElement
  duzenle?: SuruYem | null
}

const YEM_TIPLERI: YemTipi[] = ['baslatici', 'buyutme', 'bitirici']

export function YemDialog({ donemId, trigger, duzenle = null }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [tarih, setTarih] = useState(duzenle?.tarih ?? today)
  const [blokNo, setBlokNo] = useState<string>(
    duzenle?.blok_no != null ? String(duzenle.blok_no) : ''
  )
  const [yemKg, setYemKg] = useState(duzenle ? String(duzenle.yem_kg) : '')
  const [yemTipi, setYemTipi] = useState<YemTipi>(duzenle?.yem_tipi ?? 'baslatici')

  function submit(formData: FormData) {
    setHata(null)
    formData.set('tarih', tarih)
    formData.set('blok_no', blokNo)
    formData.set('yem_kg', yemKg)
    formData.set('yem_tipi', yemTipi)

    startTransition(async () => {
      const res = duzenle
        ? await updateYem(duzenle.id, formData)
        : await addYem(donemId, formData)
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
          <DialogTitle>{duzenle ? 'Yem Kaydını Düzenle' : 'Yeni Yem Kaydı'}</DialogTitle>
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

          <Field label="Yem (kg)">
            <input
              required
              inputMode="decimal"
              value={yemKg}
              onChange={(e) => setYemKg(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="0.00"
            />
          </Field>

          <Field label="Yem tipi">
            <select
              required
              value={yemTipi}
              onChange={(e) => setYemTipi(e.target.value as YemTipi)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              {YEM_TIPLERI.map((t) => (
                <option key={t} value={t}>
                  {YEM_TIPI_LABEL[t]}
                </option>
              ))}
            </select>
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
