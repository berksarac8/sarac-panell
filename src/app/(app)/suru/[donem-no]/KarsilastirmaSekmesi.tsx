'use client'

import { useEffect, useState, useTransition } from 'react'
import { getBlokMetrikleri } from '@/lib/actions/suru-metrik'
import { karsilastirTartilar, type TartiKarsilastirma } from '@/lib/suru/karsilastirma'
import type { BlokGunlukMetrik } from '@/types/suru-metrik'
import type { SuruTarti } from '@/types/suru'

const NF_KG = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})
const NF_PCT = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function fmtKg(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return NF_KG.format(v)
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = NF_PCT.format(v)
  return v > 0 ? `+${s}%` : `${s}%`
}

/**
 * Tartı (gerçek) vs Banvit tahmini karşılaştırma tablosu.
 *
 * 3 blok için ayrı ayrı metrik çekilir, sonuçlar tek tabloda birleşir.
 * Tartı blok_no'su null (genel) ise her bloğun metrik'inden ilk eşleşen
 * tarihteki tahmin alınır (basitlik için: blok 1 önceliklidir).
 */
export function KarsilastirmaSekmesi({
  donemId,
  tartilar,
  bloklar,
}: {
  donemId: string
  tartilar: SuruTarti[]
  bloklar: { blok_no: 1 | 2 | 3 }[]
}) {
  const [satirlar, setSatirlar] = useState<TartiKarsilastirma[]>([])
  const [hata, setHata] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (tartilar.length === 0) {
      setSatirlar([])
      return
    }
    setHata(null)
    startTransition(async () => {
      // 3 blok için metrikleri paralel çek
      const tumBlokNolari: (1 | 2 | 3)[] = bloklar.map((b) => b.blok_no)
      const results = await Promise.all(
        tumBlokNolari.map((bn) => getBlokMetrikleri(donemId, bn))
      )

      const tumSatirlar: TartiKarsilastirma[] = []
      const hatalar: string[] = []

      for (let i = 0; i < tumBlokNolari.length; i++) {
        const bn = tumBlokNolari[i]
        const res = results[i]
        if (res.error) {
          hatalar.push(`Blok ${bn}: ${res.error}`)
          continue
        }
        const blokTartilar = tartilar.filter(
          (t) => t.blok_no === bn || t.blok_no === null
        )
        const k = karsilastirTartilar(blokTartilar, res.data as BlokGunlukMetrik[], bn)
        // tartı id zaten her blok için unique ama "genel" tartı 3 bloka da girer →
        // o yüzden ekledikçe set ile uniquele
        for (const sat of k) {
          // Sadece bu blok için olan (genel olanı blok 1 baz alıyoruz)
          if (bn === tumBlokNolari[0]) {
            tumSatirlar.push(sat)
          } else {
            // bu bloka spesifik tartılar dahil
            const tarti = tartilar.find((t) => t.id === sat.tartiId)
            if (tarti && tarti.blok_no === bn) {
              tumSatirlar.push(sat)
            }
          }
        }
      }

      // Sırala: tarih desc, blok asc
      tumSatirlar.sort((a, b) => {
        if (a.tarih !== b.tarih) return a.tarih < b.tarih ? 1 : -1
        return (a.blokNo ?? 0) - (b.blokNo ?? 0)
      })

      setSatirlar(tumSatirlar)
      setHata(hatalar.length > 0 ? hatalar.join('; ') : null)
    })
  }, [donemId, tartilar, bloklar])

  if (tartilar.length === 0) {
    return (
      <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
        Henüz tartı kaydı yok. Tartı eklendikçe Banvit tahminiyle karşılaştırma
        burada görünecek.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hata && (
        <div className="rounded border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">
          Uyarı: {hata}
        </div>
      )}

      {pending && (
        <div className="text-xs text-muted-foreground">Karşılaştırma hesaplanıyor…</div>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">Blok</th>
              <th className="px-3 py-2 text-right">Gerçek (kg)</th>
              <th className="px-3 py-2 text-right">Tahmini (kg)</th>
              <th className="px-3 py-2 text-right">Fark (kg)</th>
              <th className="px-3 py-2 text-right">Fark %</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 && !pending ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Karşılaştırılacak veri yok.
                </td>
              </tr>
            ) : (
              satirlar.map((s) => {
                const yesil = s.farkKg !== null && s.farkKg >= 0
                const farkRenk =
                  s.farkKg === null
                    ? ''
                    : yesil
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'bg-rose-50 text-rose-900'
                return (
                  <tr key={s.tartiId + '-' + (s.blokNo ?? 'g')} className="border-t hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-mono">{s.tarih}</td>
                    <td className="px-3 py-2">
                      {s.blokNo === null ? 'Genel' : `Blok ${s.blokNo}`}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmtKg(s.gercekKg)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtKg(s.tahminiKg)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${farkRenk}`}>
                      {s.farkKg === null
                        ? '—'
                        : (s.farkKg > 0 ? '+' : '') + NF_KG.format(s.farkKg)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${farkRenk}`}>
                      {fmtPct(s.farkYuzde)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Tahmini değerler Banvit referansı + günlük su tüketiminden hesaplanan
        tahmini ortalama gram bazındadır. Yeşil = gerçek tahminin üzerinde,
        Kırmızı = altında.
      </p>
    </div>
  )
}
