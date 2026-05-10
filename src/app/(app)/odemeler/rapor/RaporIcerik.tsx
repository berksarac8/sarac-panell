'use client'

import * as React from 'react'
import { useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DurumBadge } from '../DurumBadge'
import { hesaplaDurum, DURUM_LABEL } from '@/lib/odemeler/durum'
import { odemelerToCsv, downloadCsv, formatTutar } from '@/lib/odemeler/export'
import type { Odeme, OdemeDurum } from '@/types/odemeler'

type Props = {
  odemeler: Odeme[]
  ay: string // 'YYYY-MM'
}

const AY_ISIMLERI = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

export function RaporIcerik({ odemeler, ay }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

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

  const ozet = useMemo(() => {
    let toplam = 0
    let odenmis = 0
    let gecikmis = 0
    const katMap = new Map<string, { isim: string; renk: string; tutar: number }>()
    for (const o of enriched) {
      const t = Number(o.tutar)
      toplam += t
      if (o._durum === 'odendi') odenmis += t
      if (o._durum === 'gecikmis') gecikmis += t
      const katAd = o.kategori?.isim ?? 'Kategorisiz'
      const katRenk = o.kategori?.renk ?? '#94a3b8'
      const prev = katMap.get(katAd)
      if (prev) {
        prev.tutar += t
      } else {
        katMap.set(katAd, { isim: katAd, renk: katRenk, tutar: t })
      }
    }
    const kalan = toplam - odenmis
    const kategoriler = Array.from(katMap.values()).sort((a, b) => b.tutar - a.tutar)
    return { toplam, odenmis, kalan, gecikmis, kategoriler }
  }, [enriched])

  const [yStr, mStr] = ay.split('-')
  const ayLabel = `${AY_ISIMLERI[Number(mStr) - 1] ?? mStr} ${yStr}`

  function ayDegistir(yeni: string) {
    startTransition(() => {
      const params = new URLSearchParams()
      params.set('ay', yeni)
      router.push(`?${params.toString()}`)
    })
  }

  function csvIndir() {
    const csv = odemelerToCsv(enriched, bugun)
    downloadCsv(csv, `odemeler-${ay}.csv`)
  }

  function pdfIndir() {
    // Tarayıcının print iletişim kutusunu aç — kullanıcı "PDF olarak kaydet" seçeneğini kullanır.
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Üst bar: ay seçici + indirme butonları */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border bg-card p-3 print:hidden">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Ay</label>
          <input
            type="month"
            value={ay}
            onChange={(e) => ayDegistir(e.target.value)}
            disabled={pending}
            className="border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={csvIndir}
            className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700"
          >
            Excel İndir (CSV)
          </button>
          <button
            type="button"
            onClick={pdfIndir}
            className="text-sm bg-slate-700 text-white px-3 py-1.5 rounded-md hover:bg-slate-800"
          >
            PDF İndir (Yazdır)
          </button>
        </div>
      </div>

      {/* Print başlık (sadece yazdırırken görünür) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Aylık Ödeme Raporu</h1>
        <p className="text-sm text-slate-700">{ayLabel}</p>
      </div>

      {/* Özet kartları */}
      <h2 className="text-lg font-semibold print:text-base">{ayLabel} özeti</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kart
          baslik="Toplam"
          tutar={ozet.toplam}
          renk="bg-indigo-50 border-indigo-200 text-indigo-900"
        />
        <Kart
          baslik="Ödenmiş"
          tutar={ozet.odenmis}
          renk="bg-emerald-50 border-emerald-200 text-emerald-900"
        />
        <Kart
          baslik="Kalan"
          tutar={ozet.kalan}
          renk="bg-amber-50 border-amber-200 text-amber-900"
        />
        <Kart
          baslik="Gecikmiş"
          tutar={ozet.gecikmis}
          renk="bg-rose-50 border-rose-200 text-rose-900"
        />
      </div>

      {/* Kategori dağılımı */}
      {ozet.kategoriler.length > 0 && (
        <div className="rounded-md border bg-card p-3">
          <h3 className="text-sm font-semibold mb-2">Kategori bazlı dağılım</h3>
          <div className="space-y-2">
            {ozet.kategoriler.map((k) => {
              const yuzde = ozet.toplam > 0 ? (k.tutar / ozet.toplam) * 100 : 0
              return (
                <div key={k.isim} className="flex items-center gap-3">
                  <div className="w-32 text-sm shrink-0 truncate flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ background: k.renk }}
                    />
                    {k.isim}
                  </div>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${yuzde}%`, background: k.renk }}
                    />
                  </div>
                  <div className="w-32 text-sm font-mono text-right">
                    {formatTutar(k.tutar)} ₺
                  </div>
                  <div className="w-12 text-xs text-muted-foreground text-right">
                    %{yuzde.toFixed(0)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detay tablo */}
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
            </tr>
          </thead>
          <tbody>
            {enriched.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Bu ayda kayıt yok.
                </td>
              </tr>
            )}
            {enriched.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">
                  <DurumBadge durum={o._durum} />
                  <span className="sr-only">{DURUM_LABEL[o._durum]}</span>
                </td>
                <td className="px-3 py-2 font-medium">{o.aciklama}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {o.kategori?.isim ?? '—'}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{o.kime ?? '—'}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatTutar(Number(o.tutar))} ₺
                </td>
                <td className="px-3 py-2 font-mono">{o.vade_tarihi}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {o.odeme_tarihi ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
          {enriched.length > 0 && (
            <tfoot className="bg-slate-50 text-sm">
              <tr>
                <td colSpan={4} className="px-3 py-2 font-semibold text-right">
                  Toplam
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">
                  {formatTutar(ozet.toplam)} ₺
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function Kart({
  baslik,
  tutar,
  renk,
}: {
  baslik: string
  tutar: number
  renk: string
}) {
  return (
    <div className={`rounded-md border p-3 ${renk}`}>
      <div className="text-xs opacity-80">{baslik}</div>
      <div className="text-lg font-mono font-semibold mt-1">
        {formatTutar(tutar)} ₺
      </div>
    </div>
  )
}
