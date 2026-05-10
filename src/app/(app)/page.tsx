import { getDashboardData } from '@/lib/actions/dashboard'
import { listOlayKategorileri, listSuruDonemleri, getActiveSuruDonem } from '@/lib/actions/olaylar'
import { HizliEylemler } from './HizliEylemler'
import { AktifSuruWidget } from './AktifSuruWidget'
import { AcilOdemelerWidget } from './AcilOdemelerWidget'
import { SonOlaylarWidget } from './SonOlaylarWidget'
import { EksikGunlerWidget } from './EksikGunlerWidget'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [dash, olayKatRes, donemlerRes, aktifDonemRefRes] = await Promise.all([
    getDashboardData(),
    listOlayKategorileri(),
    listSuruDonemleri(),
    getActiveSuruDonem(),
  ])

  if (dash.error) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Dashboard</h1>
        <div className="rounded border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">
          Hata: {dash.error}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Çiftliğin özet ekranı</p>
      </header>

      <HizliEylemler
        odemeKategorileri={dash.odemeKategorileri}
        olayKategorileri={olayKatRes.data}
        donemler={donemlerRes.data}
        aktifDonem={aktifDonemRefRes.data}
        aktifDonemId={dash.aktifDonem?.id ?? null}
        aktifDonemGirisTarihi={dash.aktifDonem?.giris_tarihi ?? null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AktifSuruWidget donem={dash.aktifDonem} ozet={dash.donemOzet} />
          <SonOlaylarWidget olaylar={dash.sonOlaylar} />
        </div>
        <div className="space-y-4">
          <EksikGunlerWidget
            donem={dash.aktifDonem}
            eksikGunler={dash.eksikGunler}
          />
          <AcilOdemelerWidget odemeler={dash.acilOdemeler} />
        </div>
      </div>
    </div>
  )
}
