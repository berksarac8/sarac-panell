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
import { kapatBlok } from '@/lib/actions/suru'
import type { SuruBlok } from '@/types/suru'

type Props = {
  blok: SuruBlok
  trigger: React.ReactElement
}

export function BlokKapatDialog({ blok, trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [cikisTarihi, setCikisTarihi] = useState(today)
  const [cikisAdedi, setCikisAdedi] = useState('')
  const [cikisKg, setCikisKg] = useState('')

  function submit(formData: FormData) {
    setHata(null)
    formData.set('cikis_tarihi', cikisTarihi)
    formData.set('cikis_adedi', cikisAdedi)
    formData.set('cikis_kg', cikisKg)

    startTransition(async () => {
      const res = await kapatBlok(blok.id, formData)
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
          <DialogTitle>Blok {blok.blok_no} — Kapat</DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <div className="rounded bg-slate-50 p-2 text-sm">
            Bu blokta giriş adedi:{' '}
            <span className="font-mono font-medium">
              {blok.giris_adedi.toLocaleString('tr-TR')}
            </span>
          </div>

          <Field label="Çıkış tarihi">
            <input
              required
              type="date"
              value={cikisTarihi}
              onChange={(e) => setCikisTarihi(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Çıkış adedi">
            <input
              required
              inputMode="numeric"
              value={cikisAdedi}
              onChange={(e) => setCikisAdedi(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="0"
            />
          </Field>

          <Field label="Çıkış kg">
            <input
              required
              inputMode="decimal"
              value={cikisKg}
              onChange={(e) => setCikisKg(e.target.value)}
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
              className="text-sm px-3 py-1.5 bg-rose-600 text-white rounded disabled:opacity-50"
            >
              {pending ? 'Kapatılıyor…' : 'Bloğu Kapat'}
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
