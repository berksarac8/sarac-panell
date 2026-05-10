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
import { createSuruDonem } from '@/lib/actions/suru'

type Props = {
  trigger: React.ReactElement
}

export function YeniSuruDialog({ trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [girisTarihi, setGirisTarihi] = useState(today)
  const [b1, setB1] = useState('')
  const [b2, setB2] = useState('')
  const [b3, setB3] = useState('')
  const [notlar, setNotlar] = useState('')

  const toplam = (Number(b1) || 0) + (Number(b2) || 0) + (Number(b3) || 0)

  function submit(formData: FormData) {
    setHata(null)
    formData.set('giris_tarihi', girisTarihi)
    formData.set('blok1_adedi', b1)
    formData.set('blok2_adedi', b2)
    formData.set('blok3_adedi', b3)
    formData.set('notlar', notlar)

    startTransition(async () => {
      const res = await createSuruDonem(formData)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setOpen(false)
      if (res.donem_no) {
        router.push(`/suru/${res.donem_no}`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Sürü Aç</DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <Field label="Geliş tarihi">
            <input
              required
              type="date"
              value={girisTarihi}
              onChange={(e) => setGirisTarihi(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Blok 1 adedi">
              <input
                required
                inputMode="numeric"
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                placeholder="0"
              />
            </Field>
            <Field label="Blok 2 adedi">
              <input
                required
                inputMode="numeric"
                value={b2}
                onChange={(e) => setB2(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                placeholder="0"
              />
            </Field>
            <Field label="Blok 3 adedi">
              <input
                required
                inputMode="numeric"
                value={b3}
                onChange={(e) => setB3(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                placeholder="0"
              />
            </Field>
          </div>

          <div className="rounded bg-slate-50 p-2 text-sm">
            Toplam: <span className="font-mono font-medium">{toplam}</span>
          </div>

          <Field label="Notlar">
            <textarea
              value={notlar}
              onChange={(e) => setNotlar(e.target.value)}
              rows={2}
              className="w-full border rounded px-2 py-1.5 text-sm"
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
              {pending ? 'Açılıyor…' : 'Sürüyü Aç'}
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
