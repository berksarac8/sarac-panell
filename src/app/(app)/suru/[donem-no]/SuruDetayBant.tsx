import { Badge } from '@/components/ui/badge'
import type { SuruDonem, SuruBlok } from '@/types/suru'
import { BlokKapatDialog } from './BlokKapatDialog'
import { VeriGirButton } from './VeriGirButton'

function gunSayisi(girisTarihi: string): number {
  const giris = new Date(girisTarihi + 'T00:00:00')
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((bugun.getTime() - giris.getTime()) / 86400000))
}

export function SuruDetayBant({
  donem,
  bloklar,
}: {
  donem: SuruDonem
  bloklar: SuruBlok[]
}) {
  const sirali = [...bloklar].sort((a, b) => a.blok_no - b.blok_no)
  const toplamGiris = sirali.reduce((s, b) => s + b.giris_adedi, 0)

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Sürü Dönemi</div>
          <div className="text-2xl font-semibold font-mono">{donem.donem_no}</div>
          <div className="text-sm text-muted-foreground">
            Giriş: {donem.giris_tarihi} · {gunSayisi(donem.giris_tarihi)}. gün
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={donem.durum === 'aktif' ? 'success' : 'muted'}>
            {donem.durum === 'aktif' ? 'Aktif' : 'Kapalı'}
          </Badge>
          <div className="text-sm font-mono">
            Toplam giriş:{' '}
            <span className="font-semibold">{toplamGiris.toLocaleString('tr-TR')}</span>
          </div>
        </div>
      </div>

      {donem.durum === 'aktif' && (
        <div className="mb-3">
          <VeriGirButton donemId={donem.id} girisTarihi={donem.giris_tarihi} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {sirali.map((b) => (
          <BlokKart key={b.id} blok={b} donemDurum={donem.durum} />
        ))}
      </div>

      {donem.notlar && (
        <div className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium">Notlar: </span>
          {donem.notlar}
        </div>
      )}
    </div>
  )
}

function BlokKart({
  blok,
  donemDurum,
}: {
  blok: SuruBlok
  donemDurum: 'aktif' | 'kapali'
}) {
  const kapali = blok.cikis_tarihi !== null

  return (
    <div className="rounded border p-3 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-muted-foreground">Blok {blok.blok_no}</div>
        <Badge variant={kapali ? 'muted' : 'success'}>{kapali ? 'Kapalı' : 'Aktif'}</Badge>
      </div>
      <div className="text-lg font-mono font-medium">
        {blok.giris_adedi.toLocaleString('tr-TR')}
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
        {kapali ? (
          <>
            <div>Çıkış: {blok.cikis_tarihi}</div>
            <div>
              Adet: {(blok.cikis_adedi ?? 0).toLocaleString('tr-TR')} · Kg:{' '}
              {(blok.cikis_kg ?? 0).toLocaleString('tr-TR')}
            </div>
          </>
        ) : (
          <div>Henüz kapanmadı</div>
        )}
      </div>
      {!kapali && donemDurum === 'aktif' && (
        <div className="mt-2">
          <BlokKapatDialog
            blok={blok}
            trigger={
              <button className="text-xs px-2 py-1 border rounded text-rose-700 hover:bg-rose-50">
                Bloğu Kapat
              </button>
            }
          />
        </div>
      )}
    </div>
  )
}
