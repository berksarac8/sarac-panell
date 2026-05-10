import {
  listOlaylar,
  listOlayKategorileri,
  listSuruDonemleri,
  getActiveSuruDonem,
} from '@/lib/actions/olaylar'
import { OlaylarListe } from './OlaylarListe'

type SearchParams = {
  kategori?: string
  bas?: string
  bit?: string
  donem?: string
  q?: string
}

export default async function OlaylarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  const kategoriIds = sp.kategori?.split(',').filter(Boolean) ?? []
  const bas = sp.bas || null
  const bit = sp.bit || null
  const donem = sp.donem || null
  const q = sp.q || null

  const [olaylarRes, katsRes, donemlerRes, aktifRes] = await Promise.all([
    listOlaylar({
      kategori_ids: kategoriIds.length ? kategoriIds : undefined,
      tarih_baslangic: bas,
      tarih_bitis: bit,
      donem_id: donem,
      arama: q,
    }),
    listOlayKategorileri(),
    listSuruDonemleri(),
    getActiveSuruDonem(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Çiftlik Olayları</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Veteriner, yem teslimat, bakım gibi çiftlikte yaşanan olayların kaydı.
        </p>
      </header>

      {olaylarRes.error && (
        <p className="text-sm text-rose-600">Hata: {olaylarRes.error}</p>
      )}

      <OlaylarListe
        olaylar={olaylarRes.data}
        kategoriler={katsRes.data}
        donemler={donemlerRes.data}
        aktifDonem={aktifRes.data}
      />
    </div>
  )
}
