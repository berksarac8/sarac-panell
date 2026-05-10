import Link from 'next/link'
import type { SuruDonem } from '@/types/suru'

function sonCikisTarihi(donem: SuruDonem): string {
  const tarihler = (donem.bloklar ?? [])
    .map((b) => b.cikis_tarihi)
    .filter((t): t is string => !!t)
  if (tarihler.length === 0) return '—'
  return tarihler.sort().slice(-1)[0]
}

export function SuruListe({ donemler }: { donemler: SuruDonem[] }) {
  if (donemler.length === 0) {
    return (
      <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
        Henüz kapanmış sürü yok.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Dönem No</th>
            <th className="px-3 py-2">Giriş</th>
            <th className="px-3 py-2">Çıkış</th>
            <th className="px-3 py-2 text-right">Toplam Giriş</th>
            <th className="px-3 py-2 text-right">Toplam Çıkış kg</th>
            <th className="px-3 py-2 text-right">FCR</th>
            <th className="px-3 py-2 text-right">Kar/Zarar</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {donemler.map((d) => {
            const bloklar = d.bloklar ?? []
            const toplamGiris = bloklar.reduce((s, b) => s + b.giris_adedi, 0)
            const toplamKg = bloklar.reduce((s, b) => s + (b.cikis_kg ?? 0), 0)
            return (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2 font-mono">{d.donem_no}</td>
                <td className="px-3 py-2">{d.giris_tarihi}</td>
                <td className="px-3 py-2">{sonCikisTarihi(d)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {toplamGiris.toLocaleString('tr-TR')}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {toplamKg > 0 ? toplamKg.toLocaleString('tr-TR') : '—'}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  <span title="Excel formülü beklenirken">—</span>
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  <span title="Excel formülü beklenirken">—</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/suru/${d.donem_no}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Detay →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-slate-50">
        Not: FCR ve Kar/Zarar sütunları Excel formülü Selin tarafından sağlandığında dolacak (4. iterasyon).
      </div>
    </div>
  )
}
