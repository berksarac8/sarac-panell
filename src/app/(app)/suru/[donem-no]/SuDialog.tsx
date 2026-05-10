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
import { addSu, updateSu, deleteSu } from '@/lib/actions/suru-metrik'
import type { SuruSuKaydi } from '@/types/suru-metrik'

type Props = {
  donemId: string
  blokNo: 1 | 2 | 3
  girisTarihi: string // 'YYYY-MM-DD' — gun_no hesabı için
  trigger: React.ReactElement
  duzenle?: SuruSuKaydi | null
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

export function SuDialog({
  donemId,
  blokNo,
  girisTarihi,
  trigger,
  duzenle = null,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [tarih, setTarih] = useState(duzenle?.tarih ?? today)
  const [suLitre, setSuLitre] = useState(duzenle ? String(duzenle.su_litre) : '')

  const gunNo = gunNoHesapla(girisTarihi, tarih)
  const gunNoGecerli = gunNo >= 1 && gunNo <= 44

  function submit(formData: FormData) {
    setHata(null)
    formData.set('tarih', tarih)
    formData.set('su_litre', suLitre)

    const litre = Number(suLitre.replace(',', '.'))
    if (!Number.isFinite(litre) || litre < 0) {
      setHata('Geçersiz su litre')
      return
    }

    if (duzenle) {
      // Sadece su_litre değiştiriliyor (gun_no/tarih değişmez)
      startTransition(async () => {
        const res = await updateSu(duzenle.id, litre)
        if ('error' in res && res.error) {
          setHata(res.error)
          return
        }
        setOpen(false)
        router.refresh()
      })
      return
    }

    if (!gunNoGecerli) {
      setHata(
        gunNo < 1
          ? 'Tarih dönem giriş tarihinden önce olamaz'
          : 'Bu tarih için referans yok (gün > 44)'
      )
      return
    }

    startTransition(async () => {
      const res = await addSu(donemId, blokNo, tarih, gunNo, litre)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  function sil() {
    if (!duzenle) return
    if (!confirm('Bu su kaydını silmek istediğine emin misin?')) return
    setHata(null)
    startTransition(async () => {
      const res = await deleteSu(duzenle.id)
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
          <DialogTitle>
            {duzenle ? `Su Kaydını Düzenle (Blok ${blokNo})` : `Yeni Su Kaydı (Blok ${blokNo})`}
          </DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-3">
          <Field label="Tarih">
            <input
              required
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              disabled={!!duzenle}
              className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-500"
            />
            {!duzenle && (
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
                {!gunNoGecerli && (
                  <span className="ml-1 text-rose-600">
                    {gunNo < 1
                      ? '(giriş tarihinden önce)'
                      : '(referans yok, max 44)'}
                  </span>
                )}
              </div>
            )}
            {duzenle && (
              <div className="mt-1 text-xs text-muted-foreground">
                Gün no: <span className="font-mono">{duzenle.gun_no}</span>
              </div>
            )}
          </Field>

          <Field label="Su tüketimi (litre)">
            <input
              required
              inputMode="decimal"
              value={suLitre}
              onChange={(e) => setSuLitre(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              placeholder="0"
            />
          </Field>

          {hata && <p className="text-sm text-rose-600">{hata}</p>}

          <div className="flex justify-between items-center gap-2 pt-2">
            <div>
              {duzenle && (
                <button
                  type="button"
                  onClick={sil}
                  disabled={pending}
                  className="text-sm px-3 py-1.5 border border-rose-200 text-rose-600 rounded disabled:opacity-50"
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
                disabled={pending || (!duzenle && !gunNoGecerli)}
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
