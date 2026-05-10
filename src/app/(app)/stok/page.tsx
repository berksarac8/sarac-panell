import {
  listStokKalemler,
  listStokHareketler,
  listSuruDonemleriRef,
} from '@/lib/actions/stok'
import { StokSayfa } from './StokSayfa'
import type { HareketTipi } from '@/types/stok'

type SearchParams = {
  tab?: string
  kalem?: string
  donem?: string
  tip?: string
  bas?: string
  bit?: string
}

export const dynamic = 'force-dynamic'

export default async function StokPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  const filtre = {
    kalem_id: sp.kalem || null,
    donem_id: sp.donem || null,
    hareket_tipi: (sp.tip === 'giris' || sp.tip === 'cikis' ? sp.tip : null) as HareketTipi | null,
    tarih_baslangic: sp.bas || null,
    tarih_bitis: sp.bit || null,
  }

  const [kalemRes, hareketRes, donemRes] = await Promise.all([
    listStokKalemler(),
    listStokHareketler(filtre),
    listSuruDonemleriRef(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Stok</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Yem, ilaç ve malzeme alımlarının/kullanımının kaydı.
        </p>
      </header>

      {(kalemRes.error || hareketRes.error) && (
        <p className="text-sm text-rose-600">
          Hata: {kalemRes.error ?? hareketRes.error}
        </p>
      )}

      <StokSayfa
        kalemler={kalemRes.data}
        hareketler={hareketRes.data}
        donemler={donemRes.data}
      />
    </div>
  )
}
