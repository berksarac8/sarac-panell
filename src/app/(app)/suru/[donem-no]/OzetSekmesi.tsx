import type { SuruDonemDetay } from '@/types/suru'

export function OzetSekmesi({ donem }: { donem: SuruDonemDetay }) {
  const toplamGiris = donem.bloklar.reduce((s, b) => s + b.giris_adedi, 0)
  const toplamCikisAdet = donem.bloklar.reduce((s, b) => s + (b.cikis_adedi ?? 0), 0)
  const toplamCikisKg = donem.bloklar.reduce((s, b) => s + Number(b.cikis_kg ?? 0), 0)
  const toplamOlum = donem.olumler.reduce((s, o) => s + o.adet, 0)
  const toplamYem = donem.yemler.reduce((s, y) => s + Number(y.yem_kg), 0)
  const sonTarti =
    donem.tartilar.length > 0
      ? donem.tartilar.slice().sort((a, b) => (a.tarih < b.tarih ? 1 : -1))[0]
      : null

  return (
    <div className="space-y-4">
      <div className="rounded border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm">
        <strong>Not:</strong> FCR, kayıp %, kar/zarar ve gün gün ölüm grafiği
        Excel formülü Selin tarafından sağlandığında dolacak (4. iterasyon). Şu an
        sadece ham toplamlar gösteriliyor.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Metrik label="Toplam giriş" value={toplamGiris.toLocaleString('tr-TR')} />
        <Metrik
          label="Toplam çıkış (adet)"
          value={
            toplamCikisAdet > 0 ? toplamCikisAdet.toLocaleString('tr-TR') : '—'
          }
        />
        <Metrik
          label="Toplam çıkış (kg)"
          value={
            toplamCikisKg > 0 ? toplamCikisKg.toLocaleString('tr-TR') : '—'
          }
        />
        <Metrik label="Toplam ölüm" value={toplamOlum.toLocaleString('tr-TR')} />
        <Metrik
          label="Toplam yem (kg)"
          value={toplamYem > 0 ? toplamYem.toLocaleString('tr-TR') : '—'}
        />
        <Metrik
          label="Son tartı ortalama (kg)"
          value={
            sonTarti
              ? `${Number(sonTarti.ortalama_kg).toLocaleString('tr-TR')} (${sonTarti.tarih})`
              : '—'
          }
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetrikPlaceholder label="FCR" />
        <MetrikPlaceholder label="Kayıp %" />
        <MetrikPlaceholder label="Kar / Zarar" />
      </div>

      <div className="rounded border bg-card p-4">
        <div className="text-sm font-medium mb-2">Gün gün ölüm grafiği</div>
        <div className="h-32 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-muted-foreground">
          Excel formülü beklenirken
        </div>
      </div>
    </div>
  )
}

function Metrik({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-mono font-medium mt-1">{value}</div>
    </div>
  )
}

function MetrikPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded border-2 border-dashed border-slate-300 bg-slate-50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-muted-foreground mt-1 italic">
        Excel formülü beklenirken
      </div>
    </div>
  )
}
