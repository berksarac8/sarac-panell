'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  createStokHareket,
  updateStokHareket,
  deleteStokHareket,
} from '@/lib/actions/stok'
import { StokKalemDialog } from './StokKalemDialog'
import type {
  StokKalem,
  StokKalemOzet,
  StokHareket,
  HareketTipi,
  SuruDonemRef,
} from '@/types/stok'

type Props = {
  kalemler: StokKalemOzet[]
  donemler: SuruDonemRef[]
  trigger?: React.ReactNode
  duzenle?: StokHareket | null
  defaultOpen?: boolean
  onClose?: () => void
  /** Pre-select bir kalem (Kalemler tabından "+ Hareket" için). */
  initialKalemId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StokHareketDialog({
  kalemler,
  donemler,
  trigger,
  duzenle = null,
  defaultOpen = false,
  onClose,
  initialKalemId,
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
  // Yeni kalem akışında lokal listeye eklenenler
  const [ekKalemler, setEkKalemler] = useState<StokKalem[]>([])
  const tumKalemler = [...kalemler, ...ekKalemler.map((k) => ({ ...k, toplam_giris: 0, toplam_cikis: 0, mevcut: 0 } as StokKalemOzet))]

  const today = new Date().toISOString().slice(0, 10)
  const [kalemId, setKalemId] = useState<string>(
    duzenle?.kalem_id ?? initialKalemId ?? ''
  )
  const [tip, setTip] = useState<HareketTipi>(duzenle?.hareket_tipi ?? 'giris')
  const [miktar, setMiktar] = useState(duzenle ? String(duzenle.miktar) : '')
  const [birimFiyat, setBirimFiyat] = useState(
    duzenle?.birim_fiyat != null ? String(duzenle.birim_fiyat) : ''
  )
  const [tedarikci, setTedarikci] = useState(duzenle?.tedarikci ?? '')
  const [tarih, setTarih] = useState(duzenle?.tarih ?? today)
  const [donemId, setDonemId] = useState<string>(
    duzenle?.donem_id ?? '__none__'
  )
  const [notlar, setNotlar] = useState(duzenle?.notlar ?? '')

  // Yeni kalem dialog state'i
  const [kalemDialogOpen, setKalemDialogOpen] = useState(false)

  function submit(formData: FormData) {
    setHata(null)
    formData.set('kalem_id', kalemId)
    formData.set('hareket_tipi', tip)
    formData.set('miktar', miktar)
    formData.set('birim_fiyat', birimFiyat)
    formData.set('tedarikci', tedarikci)
    formData.set('tarih', tarih)
    formData.set('donem_id', donemId)
    formData.set('notlar', notlar)

    startTransition(async () => {
      const res = duzenle
        ? await updateStokHareket(duzenle.id, formData)
        : await createStokHareket(formData)
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
    if (!confirm('Bu hareketi silmek istediğine emin misin?')) return
    startTransition(async () => {
      const res = await deleteStokHareket(duzenle.id)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setOpen(false)
      onClose?.()
    })
  }

  const secilenKalem = tumKalemler.find((k) => k.id === kalemId)

  return (
    <>
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
            <DialogTitle>{duzenle ? 'Hareketi Düzenle' : 'Yeni Stok Hareketi'}</DialogTitle>
          </DialogHeader>

          <form action={submit} className="space-y-3">
            <Field label="Stok kalemi">
              <div className="flex gap-2">
                <select
                  value={kalemId}
                  onChange={(e) => setKalemId(e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">— seç —</option>
                  {tumKalemler.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.isim} ({k.birim})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setKalemDialogOpen(true)}
                  className="text-xs px-2 py-1 border rounded"
                >
                  + Yeni
                </button>
              </div>
            </Field>

            <Field label="Hareket tipi">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTip('giris')}
                  className={`flex-1 text-sm px-3 py-1.5 rounded border ${
                    tip === 'giris'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white'
                  }`}
                >
                  Giriş (Alım)
                </button>
                <button
                  type="button"
                  onClick={() => setTip('cikis')}
                  className={`flex-1 text-sm px-3 py-1.5 rounded border ${
                    tip === 'cikis'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white'
                  }`}
                >
                  Çıkış (Kullanım)
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label={`Miktar${secilenKalem ? ` (${secilenKalem.birim})` : ''}`}>
                <input
                  required
                  inputMode="decimal"
                  value={miktar}
                  onChange={(e) => setMiktar(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                  placeholder="0.00"
                />
              </Field>

              <Field label="Birim fiyat (₺)">
                <input
                  inputMode="decimal"
                  value={birimFiyat}
                  onChange={(e) => setBirimFiyat(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                  placeholder="opsiyonel"
                />
              </Field>
            </div>

            <Field label="Tedarikçi / Kaynak">
              <input
                value={tedarikci}
                onChange={(e) => setTedarikci(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="örn. Banvit A.Ş."
              />
            </Field>

            <Field label="Tarih">
              <input
                required
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
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

      {kalemDialogOpen && (
        <StokKalemDialog
          open={kalemDialogOpen}
          onOpenChange={setKalemDialogOpen}
          onCreated={(k) => {
            setEkKalemler((prev) => [...prev, k])
            setKalemId(k.id)
          }}
        />
      )}
    </>
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
