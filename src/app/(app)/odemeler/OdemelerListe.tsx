'use client'

import * as React from 'react'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DurumBadge } from './DurumBadge'
import { OdemeDialog } from './OdemeDialog'
import { TekrarDialog } from './TekrarDialog'
import { hesaplaDurum } from '@/lib/odemeler/durum'
import { odemelerToCsv, downloadCsv } from '@/lib/odemeler/export'
import { markPaid, deleteOdeme } from '@/lib/actions/odemeler'
import type { Odeme, OdemeDurum, OdemeKategori } from '@/types/odemeler'

type Props = {
  odemeler: Odeme[]
  kategoriler: OdemeKategori[]
  durumFiltresi: OdemeDurum[]
}

export function OdemelerListe({ odemeler, kategoriler, durumFiltresi }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [duzenle, setDuzenle] = useState<Odeme | null>(null)

  const bugun = new Date()

  const enriched = useMemo(
    () =>
      odemeler.map((o) => ({
        ...o,
        _durum: hesaplaDurum(o, bugun) as OdemeDurum,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [odemeler]
  )

  const filtreli = useMemo(() => {
    if (durumFiltresi.length === 0) return enriched
    return enriched.filter((o) => durumFiltresi.includes(o._durum))
  }, [enriched, durumFiltresi])

  const toplam = filtreli.reduce((s, o) => s + Number(o.tutar), 0)
  const odenmis = filtreli.reduce((s, o) => (o._durum === 'odendi' ? s + Number(o.tutar) : s), 0)
  const kalan = toplam - odenmis

  function islemMarkPaid(id: string) {
    startTransition(async () => {
      await markPaid(id)
      router.refresh()
    })
  }

  function islemSil(id: string) {
    if (!confirm('Bu ödemeyi silmek istediğine emin misin?')) return
    startTransition(async () => {
      await deleteOdeme(id)
      router.refresh()
    })
  }

  function csvIndir() {
    const csv = odemelerToCsv(filtreli, bugun)
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(csv, `odemeler-${today}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold">Ödemeler ({filtreli.length})</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={csvIndir}
            disabled={filtreli.length === 0}
            className="text-sm border px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50"
            title="Görünen ödemeleri CSV olarak indir"
          >
            Excel İndir
          </button>
          <TekrarDialog
            kategoriler={kategoriler}
            trigger={
              <button className="text-sm border px-3 py-1.5 rounded-md">
                + Tekrarlayan Ödeme
              </button>
            }
          />
          <OdemeDialog
            kategoriler={kategoriler}
            trigger={
              <button className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md">
                + Yeni Ödeme
              </button>
            }
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">Açıklama</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Kime</th>
              <th className="px-3 py-2 text-right">Tutar</th>
              <th className="px-3 py-2">Vade</th>
              <th className="px-3 py-2">Ödeme tarihi</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtreli.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  Kayıt yok.
                </td>
              </tr>
            )}
            {filtreli.map((o) => (
              <tr key={o.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2">
                  <DurumBadge durum={o._durum} />
                </td>
                <td className="px-3 py-2 font-medium">{o.aciklama}</td>
                <td className="px-3 py-2 text-muted-foreground">{o.kategori?.isim ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{o.kime ?? '—'}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {Number(o.tutar).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ₺
                </td>
                <td className="px-3 py-2 font-mono">{o.vade_tarihi}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {o.odeme_tarihi ?? '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          className="px-2 py-1 rounded hover:bg-slate-100"
                          aria-label="İşlemler"
                        >
                          ⋯
                        </button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDuzenle(o)}>
                        Düzenle
                      </DropdownMenuItem>
                      {!o.odendi_mi && (
                        <DropdownMenuItem
                          onClick={() => islemMarkPaid(o.id)}
                          disabled={pending}
                        >
                          Ödendi işaretle
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => islemSil(o.id)}
                        disabled={pending}
                        className="text-rose-600"
                      >
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
        <span>
          Bu sayfada toplam:{' '}
          <strong className="font-mono text-foreground">
            {toplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </strong>
        </span>
        <span>
          Ödenmiş:{' '}
          <strong className="font-mono text-emerald-700">
            {odenmis.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </strong>
        </span>
        <span>
          Kalan:{' '}
          <strong className="font-mono text-rose-700">
            {kalan.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </strong>
        </span>
      </div>

      {duzenle && (
        <OdemeDialog
          kategoriler={kategoriler}
          duzenle={duzenle}
          defaultOpen
          onClose={() => setDuzenle(null)}
          trigger={<span style={{ display: 'none' }} />}
        />
      )}
    </div>
  )
}
