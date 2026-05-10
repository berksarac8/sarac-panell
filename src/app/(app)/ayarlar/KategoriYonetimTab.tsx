'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createOdemeKategoriAyar,
  updateOdemeKategoriAyar,
  deleteOdemeKategoriAyar,
  createOlayKategoriAyar,
  updateOlayKategoriAyar,
  deleteOlayKategoriAyar,
} from '@/lib/actions/ayarlar'
import type { KategoriDetay } from '@/types/ayarlar'

type Props = {
  baslik: string
  aciklama: string
  kategoriler: KategoriDetay[]
  tip: 'odeme' | 'olay'
}

export function KategoriYonetimTab({ baslik, aciklama, kategoriler, tip }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [yeniIsim, setYeniIsim] = useState('')
  const [yeniRenk, setYeniRenk] = useState('#6366f1')
  const [hata, setHata] = useState<string | null>(null)
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [duzenleIsim, setDuzenleIsim] = useState('')
  const [duzenleRenk, setDuzenleRenk] = useState('#6366f1')

  const actions = tip === 'odeme'
    ? {
        create: createOdemeKategoriAyar,
        update: updateOdemeKategoriAyar,
        delete: deleteOdemeKategoriAyar,
      }
    : {
        create: createOlayKategoriAyar,
        update: updateOlayKategoriAyar,
        delete: deleteOlayKategoriAyar,
      }

  function ekle() {
    setHata(null)
    if (!yeniIsim.trim()) {
      setHata('Kategori adı gerekli')
      return
    }
    const fd = new FormData()
    fd.set('isim', yeniIsim.trim())
    fd.set('renk', yeniRenk)
    startTransition(async () => {
      const res = await actions.create(fd)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setYeniIsim('')
      setYeniRenk('#6366f1')
      router.refresh()
    })
  }

  function baslaDuzenle(k: KategoriDetay) {
    setDuzenleId(k.id)
    setDuzenleIsim(k.isim)
    setDuzenleRenk(k.renk)
    setHata(null)
  }

  function iptalDuzenle() {
    setDuzenleId(null)
    setDuzenleIsim('')
    setDuzenleRenk('#6366f1')
  }

  function kaydetDuzenle(id: string) {
    setHata(null)
    if (!duzenleIsim.trim()) {
      setHata('Kategori adı gerekli')
      return
    }
    const fd = new FormData()
    fd.set('isim', duzenleIsim.trim())
    fd.set('renk', duzenleRenk)
    startTransition(async () => {
      const res = await actions.update(id, fd)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      iptalDuzenle()
      router.refresh()
    })
  }

  function sil(k: KategoriDetay) {
    setHata(null)
    if (k.sistem) {
      setHata('Bu kategori sistemde tanımlı, silinemez.')
      return
    }
    if (k.baglı_kayit_sayisi > 0) {
      if (
        !confirm(
          `Bu kategoriye ${k.baglı_kayit_sayisi} kayıt bağlı. Yine de silinemez. Önce kayıtların kategorisini değiştirin.`
        )
      )
        return
    } else {
      if (!confirm(`"${k.isim}" kategorisini silmek istediğine emin misin?`)) return
    }
    startTransition(async () => {
      const res = await actions.delete(k.id)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div>
        <h3 className="text-base font-semibold">{baslik}</h3>
        <p className="text-xs text-muted-foreground mt-1">{aciklama}</p>
      </div>

      {hata && <p className="text-sm text-rose-600">{hata}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-12">Renk</th>
              <th className="px-3 py-2">İsim</th>
              <th className="px-3 py-2 text-right">Bağlı kayıt</th>
              <th className="px-3 py-2">Tür</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {kategoriler.map((k) =>
              duzenleId === k.id ? (
                <tr key={k.id} className="border-t bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="color"
                      value={duzenleRenk}
                      onChange={(e) => setDuzenleRenk(e.target.value)}
                      className="w-8 h-8 border-0 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={duzenleIsim}
                      onChange={(e) => setDuzenleIsim(e.target.value)}
                      disabled={k.sistem}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {k.baglı_kayit_sayisi}
                  </td>
                  <td className="px-3 py-2">
                    {k.sistem ? (
                      <span className="text-xs text-muted-foreground">Sistem</span>
                    ) : (
                      <span className="text-xs text-emerald-700">Özel</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => kaydetDuzenle(k.id)}
                        disabled={pending}
                        className="text-xs px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                      >
                        Kaydet
                      </button>
                      <button
                        onClick={iptalDuzenle}
                        className="text-xs px-2 py-1 border rounded"
                      >
                        İptal
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={k.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span
                      className="inline-block w-6 h-6 rounded border"
                      style={{ backgroundColor: k.renk }}
                      title={k.renk}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{k.isim}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {k.baglı_kayit_sayisi}
                  </td>
                  <td className="px-3 py-2">
                    {k.sistem ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Sistem
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Özel
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => baslaDuzenle(k)}
                        className="text-xs px-2 py-1 border rounded hover:bg-white"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => sil(k)}
                        disabled={k.sistem || k.baglı_kayit_sayisi > 0}
                        title={
                          k.sistem
                            ? 'Sistem kategorisi silinemez'
                            : k.baglı_kayit_sayisi > 0
                            ? `${k.baglı_kayit_sayisi} kayıt bağlı`
                            : 'Sil'
                        }
                        className="text-xs px-2 py-1 border border-rose-200 text-rose-700 rounded hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {kategoriler.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Kategori yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-2 pt-3 border-t">
        <div>
          <label className="text-xs text-muted-foreground">Renk</label>
          <input
            type="color"
            value={yeniRenk}
            onChange={(e) => setYeniRenk(e.target.value)}
            className="block mt-1 w-12 h-9 border rounded cursor-pointer"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted-foreground">Yeni kategori adı</label>
          <input
            value={yeniIsim}
            onChange={(e) => setYeniIsim(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ekle()
              }
            }}
            placeholder="örn. Banka komisyonu"
            className="block w-full mt-1 text-sm border rounded px-2 py-1.5"
          />
        </div>
        <button
          type="button"
          onClick={ekle}
          disabled={pending || !yeniIsim.trim()}
          className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          + Ekle
        </button>
      </div>
    </div>
  )
}
