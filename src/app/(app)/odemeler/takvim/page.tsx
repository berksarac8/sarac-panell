import Link from 'next/link'
import { listOdemeler } from '@/lib/actions/odemeler'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OdemeTakvimi } from './OdemeTakvimi'

export default async function OdemeTakvimiPage() {
  const { data, error } = await listOdemeler({})

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ödemeler</h1>
      </header>

      <Tabs defaultValue="takvim">
        <TabsList>
          <TabsTrigger value="liste" asChild>
            <Link href="/odemeler">Liste</Link>
          </TabsTrigger>
          <TabsTrigger value="takvim" asChild>
            <Link href="/odemeler/takvim">Takvim</Link>
          </TabsTrigger>
          <TabsTrigger value="rapor" asChild>
            <Link href="/odemeler/rapor">Rapor</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="text-sm text-rose-600">Hata: {error}</p>}

      <OdemeTakvimi odemeler={data} />
    </div>
  )
}
