import Link from 'next/link'
import type { SuruDonem } from '@/types/suru'
import { YeniSuruDialog } from './suru/YeniSuruDialog'

function gunSayisi(girisTarihi: string): number {
  const giris = new Date(girisTarihi + 'T00:00:00')
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const diff = bugun.getTime() - giris.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

type Ozet = {
  sonTartiOrtKg: number | null
  sonTartiTarih: string | null
  son7GunOlumToplam: number
}

export function AktifSuruWidget({
  donem,
  ozet,
}: {
  donem: SuruDonem | null
  ozet: Ozet | null
}) {
  if (!donem) {
    return (
      <section className="rounded-lg border bg-card shadow-sm p-6 text-center">
        <div className="text-sm text-muted-foreground mb-3">
          Şu an aktif sürü yok.
        </div>
        <YeniSuruDialog
          trigger={
            <button className="text-sm px-4 py-2 bg-indigo-600 text-white rounded">
              + Yeni Sürü Aç
            </button>
          }
        />
      </section>
    )
  }

  const bloklar = [...(donem.bloklar ?? [])].sort((a, b) => a.blok_no - b.blok_no)
  const toplamGiris = bloklar.reduce((s, b) => s + b.giris_adedi, 0)

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="px-4 py-3 border-b flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Aktif Sürü</div>
          <div className="text-2xl font-semibold font-mono">{donem.donem_no}</div>
          <div className="text-xs text-muted-foreground">
            Giriş: {donem.giris_tarihi} · {gunSayisi(donem.giris_tarihi)}. gün
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-xs text-muted-foreground">Toplam giriş</div>
          <div className="font-mono font-semibold">
            {toplamGiris.toLocaleString('tr-TR')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        {bloklar.map((b) => (
          <div key={b.id} className="rounded border p-2">
            <div className="text-xs text-muted-foreground">Blok {b.blok_no}</div>
            <div className="text-base font-mono font-medium">
              {b.giris_adedi.toLocaleString('tr-TR')}
            </div>
            <div
              className={`text-[11px] ${
                b.cikis_tarihi ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {b.cikis_tarihi ? `Kapandı ${b.cikis_tarihi}` : 'Aktif'}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-3">
        <div className="rounded bg-slate-50 p-2">
          <div className="text-xs text-muted-foreground">Son tartı (ort.)</div>
          <div className="font-mono text-sm">
            {ozet?.sonTartiOrtKg != null
              ? `${ozet.sonTartiOrtKg.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              : '—'}
          </div>
          {ozet?.sonTartiTarih && (
            <div className="text-[11px] text-muted-foreground font-mono">
              {ozet.sonTartiTarih}
            </div>
          )}
        </div>
        <div className="rounded bg-slate-50 p-2">
          <div className="text-xs text-muted-foreground">Son 7 gün ölüm</div>
          <div className="font-mono text-sm">
            {ozet ? ozet.son7GunOlumToplam.toLocaleString('tr-TR') : '—'}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <Link
          href={`/suru/${donem.donem_no}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          Sürü detayı →
        </Link>
      </div>
    </section>
  )
}
