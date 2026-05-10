import Link from 'next/link'
import type { SuruDonem } from '@/types/suru'

function gunSayisi(girisTarihi: string): number {
  const giris = new Date(girisTarihi + 'T00:00:00')
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const diff = bugun.getTime() - giris.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function AktifSuruBuyukKart({ donem }: { donem: SuruDonem }) {
  const bloklar = [...(donem.bloklar ?? [])].sort((a, b) => a.blok_no - b.blok_no)
  const toplamGiris = bloklar.reduce((s, b) => s + b.giris_adedi, 0)

  return (
    <Link
      href={`/suru/${donem.donem_no}`}
      className="block rounded-lg border bg-card p-4 shadow-sm hover:shadow transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Aktif Sürü</div>
          <div className="text-2xl font-semibold font-mono">{donem.donem_no}</div>
          <div className="text-sm text-muted-foreground">
            Giriş: {donem.giris_tarihi} · {gunSayisi(donem.giris_tarihi)}. gün
          </div>
        </div>
        <div className="text-sm font-mono">
          Toplam giriş:{' '}
          <span className="font-semibold">{toplamGiris.toLocaleString('tr-TR')}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {bloklar.map((b) => (
          <div key={b.id} className="rounded border p-2">
            <div className="text-xs text-muted-foreground">Blok {b.blok_no}</div>
            <div className="text-lg font-mono font-medium">
              {b.giris_adedi.toLocaleString('tr-TR')}
            </div>
            <div
              className={`text-xs ${
                b.cikis_tarihi ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {b.cikis_tarihi ? `Kapandı ${b.cikis_tarihi}` : 'Aktif'}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-sm text-indigo-600">Sürü detayı →</div>
    </Link>
  )
}
