import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getKapanisRaporu, getRaporDetay } from '@/lib/actions/suru-rapor'
import { KarsilastirmaSekmesi } from '../KarsilastirmaSekmesi'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ 'donem-no': string }>
}

const NF_INT = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
const NF_2 = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const NF_KG = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function fmt(v: number | null | undefined, fmtType: 'int' | 'kg' | 'pct' | 'fcr' = 'int'): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (fmtType === 'int') return NF_INT.format(v)
  if (fmtType === 'kg') return NF_KG.format(v)
  if (fmtType === 'fcr') return NF_2.format(v)
  if (fmtType === 'pct') return `${NF_2.format(v)}%`
  return String(v)
}

export default async function SuruRaporPage({ params }: Props) {
  const { 'donem-no': donemNo } = await params

  const [raporRes, detayRes] = await Promise.all([
    getKapanisRaporu(donemNo),
    getRaporDetay(donemNo),
  ])

  if (raporRes.error) {
    return (
      <div className="p-6">
        <Link href={`/suru/${donemNo}`} className="text-sm text-indigo-600">
          ← Sürü detayına dön
        </Link>
        <div className="mt-4 rounded border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">
          Hata: {raporRes.error}
        </div>
      </div>
    )
  }

  const rapor = raporRes.data
  if (!rapor) notFound()

  const detay = detayRes.data
  const tartilar = detay?.tartilar ?? []
  const bloklarBasit = detay
    ? detay.bloklar.map((b) => ({ blok_no: b.blok_no }))
    : ([] as { blok_no: 1 | 2 | 3 }[])

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto print:p-0 print:max-w-none">
      {/* Üst navigasyon — yazdırmada gizlenir */}
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/suru/${donemNo}`} className="text-sm text-indigo-600">
          ← Sürü detayına dön
        </Link>
        <PrintButton />
      </div>

      {/* Başlık */}
      <div className="border-b pb-3">
        <h1 className="text-2xl font-semibold">Kapanış Raporu</h1>
        <div className="text-sm text-muted-foreground">
          Dönem <span className="font-mono">{rapor.donemNo}</span> · Giriş{' '}
          {rapor.girisTarihi}
          {rapor.cikisTarihi && (
            <>
              {' '}· Son çıkış {rapor.cikisTarihi}
              {rapor.gunSayisi !== null && <> · {rapor.gunSayisi} gün</>}
            </>
          )}
        </div>
      </div>

      {rapor.durum === 'aktif' && (
        <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm print:hidden">
          ⚠ Sürü hala aktif. Rapor henüz hazır değil — tüm bloklar kapatıldığında
          tam veri görünür. Aşağıdaki değerler "şu ana kadar" durumu yansıtır.
        </div>
      )}

      {/* Dönem özeti */}
      <section>
        <h2 className="text-lg font-medium mb-2">Dönem Özeti</h2>
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Toplam Giriş" value={fmt(rapor.toplamGiris)} />
              <Row label="Toplam Çıkış (adet)" value={fmt(rapor.toplamCikisAdet)} />
              <Row label="Toplam Çıkış (kg)" value={fmt(rapor.toplamCikisKg, 'kg')} />
              <Row label="Toplam Ölüm" value={fmt(rapor.toplamOlum)} />
              <Row label="Toplam Kayıp (adet)" value={fmt(rapor.kayipAdet)} />
              <Row label="Kayıp %" value={fmt(rapor.kayipYuzde, 'pct')} />
              <Row label="Ortalama Kg (canlı)" value={fmt(rapor.ortalamaKg, 'kg')} />
              <Row label="Toplam Su (L)" value={fmt(rapor.toplamSuLitre, 'kg')} />
              <Row
                label="Tahmini Toplam Yem (kg)"
                value={fmt(rapor.tahminiToplamYemKg, 'kg')}
              />
              <Row label="FCR (Yem Çevrim Oranı)" value={fmt(rapor.fcr, 'fcr')} />
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          FCR = Tahmini Toplam Yem (kg) / Toplam Çıkış (kg). Tahmini yem Banvit
          referansı yem/su oranı × günlük su tüketiminden hesaplanır.
        </p>
      </section>

      {/* Blok karşılaştırma tablosu */}
      <section>
        <h2 className="text-lg font-medium mb-2">Blok Karşılaştırma</h2>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Metrik</th>
                {rapor.bloklar.map((b) => (
                  <th key={b.blokNo} className="px-3 py-2 text-right">
                    Blok {b.blokNo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <BlokRow label="Giriş Adedi" bloklar={rapor.bloklar} f={(b) => fmt(b.girisAdedi)} />
              <BlokRow
                label="Çıkış Tarihi"
                bloklar={rapor.bloklar}
                f={(b) => b.cikisTarihi ?? '—'}
              />
              <BlokRow label="Çıkış Adedi" bloklar={rapor.bloklar} f={(b) => fmt(b.cikisAdedi)} />
              <BlokRow
                label="Çıkış Kg"
                bloklar={rapor.bloklar}
                f={(b) => fmt(b.cikisKg, 'kg')}
              />
              <BlokRow label="Ölüm" bloklar={rapor.bloklar} f={(b) => fmt(b.toplamOlum)} />
              <BlokRow
                label="Kayıp Adet"
                bloklar={rapor.bloklar}
                f={(b) => fmt(b.kayipAdet)}
              />
              <BlokRow
                label="Kayıp %"
                bloklar={rapor.bloklar}
                f={(b) => fmt(b.kayipYuzde, 'pct')}
              />
              <BlokRow
                label="Ortalama Kg"
                bloklar={rapor.bloklar}
                f={(b) => fmt(b.ortalamaKg, 'kg')}
              />
              <BlokRow
                label="Toplam Su (L)"
                bloklar={rapor.bloklar}
                f={(b) => fmt(b.toplamSuLitre, 'kg')}
              />
              <BlokRow
                label="Tahmini Yem (kg)"
                bloklar={rapor.bloklar}
                f={(b) => fmt(b.tahminiToplamYemKg, 'kg')}
              />
              <BlokRow
                label="Tahmini Canlı Ağırlık (kg)"
                bloklar={rapor.bloklar}
                f={(b) => fmt(b.tahminiCanliAgirlikKg, 'kg')}
              />
              <BlokRow label="FCR" bloklar={rapor.bloklar} f={(b) => fmt(b.fcr, 'fcr')} />
            </tbody>
          </table>
        </div>
      </section>

      {/* Karşılaştırma (tartı vs tahmini) */}
      <section>
        <h2 className="text-lg font-medium mb-2">Tartı vs Tahmini Karşılaştırma</h2>
        {detay ? (
          <KarsilastirmaSekmesi
            donemId={detay.id}
            tartilar={tartilar}
            bloklar={bloklarBasit}
          />
        ) : (
          <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
            Tartı verisi yüklenemedi.
          </div>
        )}
      </section>

      {/* Yazdırma altbilgisi */}
      <div className="hidden print:block text-xs text-muted-foreground border-t pt-3 mt-6">
        Sarac Panel · Kapanış Raporu · Dönem {rapor.donemNo} · Yazdırma:{' '}
        {new Date().toLocaleString('tr-TR')}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t first:border-t-0">
      <td className="px-3 py-2 text-muted-foreground">{label}</td>
      <td className="px-3 py-2 text-right font-mono">{value}</td>
    </tr>
  )
}

function BlokRow<T extends { blokNo: 1 | 2 | 3 }>({
  label,
  bloklar,
  f,
}: {
  label: string
  bloklar: T[]
  f: (b: T) => string
}) {
  return (
    <tr className="border-t first:border-t-0">
      <td className="px-3 py-2 text-muted-foreground">{label}</td>
      {bloklar.map((b) => (
        <td key={b.blokNo} className="px-3 py-2 text-right font-mono">
          {f(b)}
        </td>
      ))}
    </tr>
  )
}
