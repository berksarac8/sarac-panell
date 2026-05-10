'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createOdeme, updateOdeme, createKategori } from '@/lib/actions/odemeler'
import { BelgeYonetici } from './BelgeYonetici'
import type { Odeme, OdemeKategori } from '@/types/odemeler'

type Props = {
  kategoriler: OdemeKategori[]
  trigger?: React.ReactNode
  duzenle?: Odeme | null
  onClose?: () => void
  defaultOpen?: boolean
  /** Controlled mode */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function OdemeDialog({
  kategoriler,
  trigger,
  duzenle = null,
  onClose,
  defaultOpen = false,
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
  // "Yeni kategori" akışında lokal listeye eklemek için ekstra kategoriler
  const [ekKats, setEkKats] = useState<OdemeKategori[]>([])
  const kats = React.useMemo(() => [...kategoriler, ...ekKats], [kategoriler, ekKats])
  const [yeniKategoriMod, setYeniKategoriMod] = useState(false)
  const [yeniKategoriIsim, setYeniKategoriIsim] = useState('')

  const [aciklama, setAciklama] = useState(duzenle?.aciklama ?? '')
  const [kategoriId, setKategoriId] = useState(duzenle?.kategori_id ?? '')
  const [tutar, setTutar] = useState(duzenle ? String(duzenle.tutar) : '')
  const [vade, setVade] = useState(duzenle?.vade_tarihi ?? new Date().toISOString().slice(0, 10))
  const [kime, setKime] = useState(duzenle?.kime ?? '')
  const [notlar, setNotlar] = useState(duzenle?.notlar ?? '')
  const [odendi, setOdendi] = useState(duzenle?.odendi_mi ?? false)
  const [odemeTarihi, setOdemeTarihi] = useState(
    duzenle?.odeme_tarihi ?? new Date().toISOString().slice(0, 10)
  )

  async function ekleKategori() {
    if (!yeniKategoriIsim.trim()) return
    const fd = new FormData()
    fd.set('isim', yeniKategoriIsim.trim())
    const res = await createKategori(fd)
    if ('error' in res && res.error) {
      setHata(res.error)
      return
    }
    if ('data' in res && res.data) {
      setEkKats((prev) => [...prev, res.data!])
      setKategoriId(res.data.id)
    }
    setYeniKategoriIsim('')
    setYeniKategoriMod(false)
  }

  function submit(formData: FormData) {
    setHata(null)
    formData.set('aciklama', aciklama)
    formData.set('kategori_id', kategoriId)
    formData.set('tutar', tutar)
    formData.set('vade_tarihi', vade)
    formData.set('kime', kime)
    formData.set('notlar', notlar)
    formData.set('odendi_mi', odendi ? 'on' : '')
    formData.set('odeme_tarihi', odendi ? odemeTarihi : '')

    startTransition(async () => {
      const res = duzenle ? await updateOdeme(duzenle.id, formData) : await createOdeme(formData)
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
          <DialogTitle>{duzenle ? 'Ödemeyi Düzenle' : 'Yeni Ödeme'}</DialogTitle>
        </DialogHeader>

        <form
          action={submit}
          className="space-y-3"
        >
          <Field label="Açıklama">
            <input
              required
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Kategori">
            {!yeniKategoriMod ? (
              <div className="flex gap-2">
                <select
                  value={kategoriId ?? ''}
                  onChange={(e) => setKategoriId(e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">— seç —</option>
                  {kats.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.isim}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setYeniKategoriMod(true)}
                  className="text-xs px-2 py-1 border rounded"
                >
                  + Yeni
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={yeniKategoriIsim}
                  onChange={(e) => setYeniKategoriIsim(e.target.value)}
                  placeholder="Kategori adı"
                  className="flex-1 border rounded px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={ekleKategori}
                  className="text-xs px-2 py-1 bg-indigo-600 text-white rounded"
                >
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setYeniKategoriMod(false)
                    setYeniKategoriIsim('')
                  }}
                  className="text-xs px-2 py-1 border rounded"
                >
                  İptal
                </button>
              </div>
            )}
          </Field>

          <Field label="Tutar (₺)">
            <input
              required
              inputMode="decimal"
              value={tutar}
              onChange={(e) => setTutar(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="0.00"
            />
          </Field>

          <Field label="Vade tarihi">
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
              value={kime ?? ''}
              onChange={(e) => setKime(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Notlar">
            <textarea
              value={notlar ?? ''}
              onChange={(e) => setNotlar(e.target.value)}
              rows={2}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              id="odendi"
              type="checkbox"
              checked={odendi}
              onChange={(e) => setOdendi(e.target.checked)}
            />
            <label htmlFor="odendi" className="text-sm">
              Şimdi ödenmiş olarak işaretle
            </label>
          </div>

          {odendi && (
            <Field label="Ödeme tarihi">
              <input
                type="date"
                value={odemeTarihi}
                onChange={(e) => setOdemeTarihi(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </Field>
          )}

          {hata && <p className="text-sm text-rose-600">{hata}</p>}

          {duzenle && (
            <div className="border-t pt-3">
              <BelgeYonetici odemeId={duzenle.id} />
            </div>
          )}

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
