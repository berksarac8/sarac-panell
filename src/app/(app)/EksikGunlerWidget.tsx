import Link from 'next/link'
import type { EksikGunSatir } from '@/lib/actions/suru-metrik'
import type { SuruDonem } from '@/types/suru'

type Props = {
  donem: SuruDonem | null
  eksikGunler: {
    error: string | null
    data: EksikGunSatir[]
    toplamGun: number
  } | null
}

export function EksikGunlerWidget({ donem, eksikGunler }: Props) {
  if (!donem || !eksikGunler) return null
  if (eksikGunler.error) {
    return (
      <section className="rounded-lg border bg-card shadow-sm p-4">
        <div className="text-sm font-medium mb-2">Eksik Gün Tespiti</div>
        <div className="text-sm text-rose-600">Hata: {eksikGunler.error}</div>
      </section>
    )
  }

  const eksikler = eksikGunler.data
  const toplam = eksikler.length

  // Erken dönem: henüz veri girişi başlamamış olabilir
  if (eksikGunler.toplamGun < 1) {
    return (
      <section className="rounded-lg border bg-card shadow-sm p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="text-sm font-medium">Eksik Gün Tespiti</div>
          <div className="text-xs text-muted-foreground">Dönem yeni başladı</div>
        </div>
        <div className="text-sm text-muted-foreground">
          Henüz tamamlanmış gün yok. Yarın itibarıyla eksikler burada listelenir.
        </div>
      </section>
    )
  }

  if (toplam === 0) {
    return (
      <section className="rounded-lg border bg-card shadow-sm p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="text-sm font-medium">Eksik Gün Tespiti</div>
          <div className="text-xs text-emerald-700 font-medium">
            Tüm günler tamam ✓
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {eksikGunler.toplamGun} gün × bloklar — eksik kayıt yok.
        </div>
      </section>
    )
  }

  const gosterilecek = eksikler.slice(0, 5)
  const kalan = toplam - gosterilecek.length

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="px-4 py-3 border-b flex items-start justify-between">
        <div>
          <div className="text-sm font-medium">Eksik Gün Tespiti</div>
          <div className="text-xs text-muted-foreground">
            {toplam} eksik kayıt · {eksikGunler.toplamGun} tamamlanmış gün
          </div>
        </div>
        <div className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
          {toplam}
        </div>
      </div>

      <ul className="divide-y">
        {gosterilecek.map((e) => (
          <li
            key={`${e.blokNo}-${e.gunNo}`}
            className="px-4 py-2 flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {e.tarih}
              </span>
              <span className="font-medium">Blok {e.blokNo}</span>
              <span className="text-xs text-muted-foreground">
                · {e.gunNo}. gün
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {e.suEksik && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">
                  su eksik
                </span>
              )}
              {e.olumEksik && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-medium">
                  ölüm eksik
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {kalan > 0 && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          <Link
            href={`/suru/${donem.donem_no}`}
            className="text-indigo-600 hover:underline"
          >
            +{kalan} daha — detayda gör →
          </Link>
        </div>
      )}
    </section>
  )
}
