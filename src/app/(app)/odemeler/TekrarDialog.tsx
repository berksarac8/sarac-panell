'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createTekrarGrubu } from '@/lib/actions/odemeler'
import { uretTekrarVadeleri } from '@/lib/odemeler/tekrar'
import type { OdemeKategori, OdemeTekrarPeriyot } from '@/types/odemeler'

type Props = {
  kategoriler: OdemeKategori[]
  trigger: React.ReactNode
}

const PERIYOT_LABEL: Record<OdemeTekrarPeriyot, string> = {
  haftalik: 'Haftalık',
  aylik: 'Aylık',
  yillik: 'Yıllık',
}

export function TekrarDialog({ kategoriler, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [tutar, setTutar] = useState('')
  const [vade, setVade] = useState(new Date().toISOString().slice(0, 10))
  const [kime, setKime] = useState('')
  const [notlar, setNotlar] = useState('')
  const [periyot, setPeriyot] = useState<OdemeTekrarPeriyot>('aylik')
  const [tekrarSayisi, setTekrarSayisi] = useState(12)

  const onizleme =
    vade && tekrarSayisi > 0 ? uretTekrarVadeleri(vade, periyot, Math.min(tekrarSayisi, 6)) : []

  function submit(formData: FormData) {
    setHata(null)
    formData.set('baslik', baslik)
    formData.set('aciklama', aciklama)
    formData.set('kategori_id', kategoriId)
    formData.set('tutar', tutar)
    formData.set('vade_tarihi', vade)
    formData.set('kime', kime)
    formData.set('notlar', notlar)
    formData.set('odendi_mi', '')
    formData.set('odeme_tarihi', '')
    formData.set('periyot', periyot)
    formData.set('tekrar_sayisi', String(tekrarSayisi))

    startTransition(async () => {
      const res = await createTekrarGrubu(formData)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tekrarlayan Ödeme</DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <Field label="Grup başlığı (örn. Yem Taksiti 2026)">
            <input
              required
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Her bir taksitin açıklaması">
            <input
              required
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="örn. Yem taksiti"
            />
          </Field>

          <Field label="Kategori">
            <select
              value={kategoriId}
              onChange={(e) => setKategoriId(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">— seç —</option>
              {kategoriler.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.isim}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Her taksit tutarı (₺)">
            <input
              required
              inputMode="decimal"
              value={tutar}
              onChange={(e) => setTutar(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
            />
          </Field>

          <Field label="İlk vade tarihi">
            <input
              required
              type="date"
              value={vade}
              onChange={(e) => setVade(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Kime">
            <input
              value={kime}
              onChange={(e) => setKime(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Notlar">
            <textarea
              value={notlar}
              onChange={(e) => setNotlar(e.target.value)}
              rows={2}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <div className="flex gap-2">
            <Field label="Periyot">
              <select
                value={periyot}
                onChange={(e) => setPeriyot(e.target.value as OdemeTekrarPeriyot)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                {(['haftalik', 'aylik', 'yillik'] as OdemeTekrarPeriyot[]).map((p) => (
                  <option key={p} value={p}>
                    {PERIYOT_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tekrar sayısı (1–60)">
              <input
                required
                type="number"
                min={1}
                max={60}
                value={tekrarSayisi}
                onChange={(e) => setTekrarSayisi(Number(e.target.value))}
                className="w-24 border rounded px-2 py-1.5 text-sm font-mono"
              />
            </Field>
          </div>

          {onizleme.length > 0 && (
            <div className="text-xs text-muted-foreground bg-slate-50 rounded p-2">
              <strong>İlk vadeler:</strong>{' '}
              {onizleme.join(', ')}
              {tekrarSayisi > 6 && ` … +${tekrarSayisi - 6} daha`}
            </div>
          )}

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
              {pending ? `${tekrarSayisi} satır oluşturuluyor…` : `${tekrarSayisi} satır oluştur`}
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
