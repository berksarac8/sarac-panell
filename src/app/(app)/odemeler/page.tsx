import Link from 'next/link'
import { listOdemeler, listKategoriler } from '@/lib/actions/odemeler'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OdemelerListe } from './OdemelerListe'
import { FiltreCubugu } from './FiltreCubugu'
import type { OdemeDurum } from '@/types/odemeler'

type SearchParams = {
  kategori?: string
  durum?: string
  bas?: string
  bit?: string
  q?: string
}

export default async function OdemelerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  const kategoriIds = sp.kategori?.split(',').filter(Boolean) ?? []
  const durumlar = (sp.durum?.split(',').filter(Boolean) ?? []) as OdemeDurum[]
  const bas = sp.bas || null
  const bit = sp.bit || null
  const q = sp.q || null

  const [odemelerRes, katsRes] = await Promise.all([
    listOdemeler({
      kategori_ids: kategoriIds.length ? kategoriIds : undefined,
      tarih_baslangic: bas,
      tarih_bitis: bit,
      arama: q,
    }),
    listKategoriler(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ödemeler</h1>
      </header>

      <Tabs defaultValue="liste">
        <TabsList>
          <TabsTrigger value="liste" asChild>
            <Link href="/odemeler">Liste</Link>
          </TabsTrigger>
          <TabsTrigger value="takvim" asChild>
            <Link href="/odemeler/takvim">Takvim</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <FiltreCubugu kategoriler={katsRes.data} />

      {odemelerRes.error && (
        <p className="text-sm text-rose-600">Hata: {odemelerRes.error}</p>
      )}

      <OdemelerListe
        odemeler={odemelerRes.data}
        kategoriler={katsRes.data}
        durumFiltresi={durumlar}
      />
    </div>
  )
}
