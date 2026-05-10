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
import { upsertGunlukVeri } from '@/lib/actions/suru-metrik'

type Props = {
  donemId: string
  girisTarihi: string // 'YYYY-MM-DD' — gun_no hesabı için
  /** Default blok (Dashboard'dan açıldığında 1, sürü detayda blok bandından gelir) */
  defaultBlokNo?: 1 | 2 | 3
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * İki tarih (YYYY-MM-DD) arasındaki gün farkı (giris_tarihi gün 1 olarak).
 * Aynı gün → 1, ertesi gün → 2 ...
 */
function gunNoHesapla(girisTarihi: string, hedefTarih: string): number {
  const giris = new Date(girisTarihi + 'T00:00:00Z')
  const hedef = new Date(hedefTarih + 'T00:00:00Z')
  const ms = hedef.getTime() - giris.getTime()
  const gun = Math.floor(ms / (1000 * 60 * 60 * 24))
  return gun + 1
}

export function VeriGirDialog({
  donemId,
  girisTarihi,
  defaultBlokNo = 1,
  trigger,
  open: openProp,
  onOpenChange,
}: Props) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v)
    if (openProp === undefined) setInternalOpen(v)
    if (v) {
      // Açılırken mesajları temizle
      setHata(null)
      setBasari(null)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const [tarih, setTarih] = useState(today)
  const [blokNo, setBlokNo] = useState<1 | 2 | 3>(defaultBlokNo)
  const [suLitre, setSuLitre] = useState('')
  const [olumAdet, setOlumAdet] = useState('')
  const [olumSebep, setOlumSebep] = useState('')

  const gunNo = gunNoHesapla(girisTarihi, tarih)
  const gunNoGecerli = gunNo >= 1 && gunNo <= 44

  function submit() {
    setHata(null)
    setBasari(null)

    const suRaw = suLitre.replace(',', '.').trim()
    const olumRaw = olumAdet.trim()
    const suGirildi = suRaw !== ''
    const olumGirildi = olumRaw !== ''

    if (!suGirildi && !olumGirildi) {
      setHata('En az bir alan girin (su veya ölüm)')
      return
    }

    let suNum: number | null = null
    if (suGirildi) {
      const n = Number(suRaw)
      if (!Number.isFinite(n) || n < 0) {
        setHata('Su litre geçersiz')
        return
      }
      suNum = n
      if (!gunNoGecerli) {
        setHata(
          gunNo < 1
            ? 'Tarih dönem giriş tarihinden önce olamaz'
            : 'Bu tarih için referans yok (gün > 44)'
        )
        return
      }
    }

    let olumNum: number | null = null
    if (olumGirildi) {
      const n = Number(olumRaw)
      if (!Number.isInteger(n) || n < 0) {
        setHata('Ölüm adedi tam sayı olmalı (≥ 0)')
        return
      }
      olumNum = n
    }

    startTransition(async () => {
      const res = await upsertGunlukVeri(
        donemId,
        blokNo,
        tarih,
        suNum,
        olumNum,
        olumGirildi ? olumSebep : null
      )
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      // Başarı mesajı
      const yapildi = res.yapildi
      const parcalar: string[] = []
      if (yapildi?.su) parcalar.push(`su ${yapildi.su === 'insert' ? 'eklendi' : 'güncellendi'}`)
      if (yapildi?.olum) parcalar.push(`ölüm ${yapildi.olum === 'insert' ? 'eklendi' : 'güncellendi'}`)
      setBasari(parcalar.length ? `Kaydedildi: ${parcalar.join(', ')}` : 'Kaydedildi')
      // Form temizle (tarih ve blok kalsın, hızlı seri giriş için)
      setSuLitre('')
      setOlumAdet('')
      setOlumSebep('')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Günlük Veri Gir (Su + Ölüm)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tarih">
              <input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Gün no:{' '}
                <span
                  className={
                    gunNoGecerli
                      ? 'font-mono text-foreground'
                      : 'font-mono text-rose-600'
                  }
                >
                  {gunNo}
                </span>
              </div>
            </Field>

            <Field label="Blok">
              <select
                value={String(blokNo)}
                onChange={(e) => setBlokNo(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="1">Blok 1</option>
                <option value="2">Blok 2</option>
                <option value="3">Blok 3</option>
              </select>
            </Field>
          </div>

          <div className="rounded border bg-sky-50/50 border-sky-200 p-2 space-y-2">
            <Field label="Su tüketimi (litre) — opsiyonel">
              <input
                inputMode="decimal"
                value={suLitre}
                onChange={(e) => setSuLitre(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                placeholder="örn. 1240"
              />
            </Field>
          </div>

          <div className="rounded border bg-rose-50/50 border-rose-200 p-2 space-y-2">
            <Field label="Ölüm adedi — opsiyonel">
              <input
                inputMode="numeric"
                value={olumAdet}
                onChange={(e) => setOlumAdet(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                placeholder="0"
              />
            </Field>
            {olumAdet.trim() !== '' && (
              <Field label="Sebep (opsiyonel)">
                <input
                  value={olumSebep}
                  onChange={(e) => setOlumSebep(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="örn. ezilme, hastalık"
                />
              </Field>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            İpucu: Aynı (blok, tarih) için tekrar kaydedersen mevcut değer üzerine yazılır.
          </div>

          {hata && <p className="text-sm text-rose-600">{hata}</p>}
          {basari && <p className="text-sm text-emerald-700">{basari}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm px-3 py-1.5 border rounded"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {pending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}
