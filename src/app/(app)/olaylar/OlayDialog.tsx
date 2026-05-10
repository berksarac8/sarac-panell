'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createOlay, updateOlay, deleteOlay, createOlayKategori } from '@/lib/actions/olaylar'
import type { CiftlikOlay, OlayKategori, SuruDonemRef } from '@/types/olaylar'

type Props = {
  kategoriler: OlayKategori[]
  donemler: SuruDonemRef[]
  aktifDonem: SuruDonemRef | null
  trigger: React.ReactNode
  duzenle?: CiftlikOlay | null
  onClose?: () => void
  defaultOpen?: boolean
}

export function OlayDialog({
  kategoriler,
  donemler,
  aktifDonem,
  trigger,
  duzenle = null,
  onClose,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [kats, setKats] = useState<OlayKategori[]>(kategoriler)
  const [yeniKat, setYeniKat] = useState(false)
  const [yeniKatIsim, setYeniKatIsim] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const [tarih, setTarih] = useState(duzenle?.tarih ?? today)
  const [kategoriId, setKategoriId] = useState(duzenle?.kategori_id ?? '')
  const [baslik, setBaslik] = useState(duzenle?.baslik ?? '')
  const [aciklama, setAciklama] = useState(duzenle?.aciklama ?? '')
  const [kisiFirma, setKisiFirma] = useState(duzenle?.kisi_firma ?? '')
  const [donemId, setDonemId] = useState<string>(
    duzenle ? duzenle.donem_id ?? '__none__' : aktifDonem?.id ?? '__none__'
  )

  async function ekleKategori() {
    if (!yeniKatIsim.trim()) return
    const fd = new FormData()
    fd.set('isim', yeniKatIsim.trim())
    const res = await createOlayKategori(fd)
    if ('error' in res && res.error) {
      setHata(res.error)
      return
    }
    if ('data' in res && res.data) {
      setKats([...kats, res.data])
      setKategoriId(res.data.id)
    }
    setYeniKatIsim('')
    setYeniKat(false)
  }

  function submit(formData: FormData) {
    setHata(null)
    formData.set('tarih', tarih)
    formData.set('kategori_id', kategoriId)
    formData.set('baslik', baslik)
    formData.set('aciklama', aciklama)
    formData.set('kisi_firma', kisiFirma)
    formData.set('donem_id', donemId)

    startTransition(async () => {
      const res = duzenle ? await updateOlay(duzenle.id, formData) : await createOlay(formData)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setOpen(false)
      onClose?.()
    })
  }

  function sil() {
    if (!duzenle) return
    if (!confirm('Bu olayı silmek istediğine emin misin?')) return
    startTransition(async () => {
      const res = await deleteOlay(duzenle.id)
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
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{duzenle ? 'Olayı Düzenle' : 'Yeni Olay'}</DialogTitle>
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

          <Field label="Kategori">
            {!yeniKat ? (
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
                  onClick={() => setYeniKat(true)}
                  className="text-xs px-2 py-1 border rounded"
                >
                  + Yeni
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={yeniKatIsim}
                  onChange={(e) => setYeniKatIsim(e.target.value)}
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
                    setYeniKat(false)
                    setYeniKatIsim('')
                  }}
                  className="text-xs px-2 py-1 border rounded"
                >
                  İptal
                </button>
              </div>
            )}
          </Field>

          <Field label="Başlık">
            <input
              required
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="örn. Veteriner ziyareti"
            />
          </Field>

          <Field label="Açıklama">
            <textarea
              value={aciklama ?? ''}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Kişi / Firma (opsiyonel)">
            <input
              value={kisiFirma ?? ''}
              onChange={(e) => setKisiFirma(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Bağlı sürü dönemi">
            <select
              value={donemId}
              onChange={(e) => setDonemId(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="__none__">Bağlı değil</option>
              {donemler.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.donem_no} {d.durum === 'aktif' ? '(aktif)' : '(kapalı)'}
                </option>
              ))}
            </select>
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
