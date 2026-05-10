import { listSuruDonemleriFull } from '@/lib/actions/suru'
import { AktifSuruBuyukKart } from './AktifSuruBuyukKart'
import { SuruListe } from './SuruListe'
import { YeniSuruDialog } from './YeniSuruDialog'

export const dynamic = 'force-dynamic'

export default async function SuruPage() {
  const { error, aktifler, gecmisler } = await listSuruDonemleriFull()

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Sürü</h1>
        <div className="rounded border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">
          Hata: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sürü</h1>
        <YeniSuruDialog
          trigger={
            <button className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded">
              + Yeni Sürü Aç
            </button>
          }
        />
      </div>

      {aktifler.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="text-muted-foreground mb-3">Şu an aktif sürü yok.</div>
          <YeniSuruDialog
            trigger={
              <button className="text-sm px-4 py-2 bg-indigo-600 text-white rounded">
                + Yeni Sürü Aç
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {aktifler.map((d) => (
            <AktifSuruBuyukKart key={d.id} donem={d} />
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium mb-2">Geçmiş Sürüler</h2>
        <SuruListe donemler={gecmisler} />
      </div>
    </div>
  )
}
