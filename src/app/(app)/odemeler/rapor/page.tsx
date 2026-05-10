import Link from 'next/link'
import { getOdemelerForReport } from '@/lib/actions/odemeler'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RaporIcerik } from './RaporIcerik'

type SearchParams = { ay?: string }

export default async function OdemelerRaporPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const ay = sp.ay && /^\d{4}-\d{2}$/.test(sp.ay) ? sp.ay : isoAy(new Date())
  const { data, error } = await getOdemelerForReport(ay)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4 print:max-w-none print:p-0">
      <header className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Ödemeler</h1>
      </header>

      <div className="print:hidden">
        <Tabs defaultValue="rapor">
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
      </div>

      {error && <p className="text-sm text-rose-600 print:hidden">Hata: {error}</p>}

      <RaporIcerik odemeler={data} ay={ay} />
    </div>
  )
}

function isoAy(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
