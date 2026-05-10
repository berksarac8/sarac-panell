import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSuruDonemByNo } from '@/lib/actions/suru'
import { SuruDetayBant } from './SuruDetayBant'
import { SuruSekmeleri } from './SuruSekmeleri'
import { OzetSekmesi } from './OzetSekmesi'
import { TartiSekmesi } from './TartiSekmesi'
import { OlumSekmesi } from './OlumSekmesi'
import { YemSekmesi } from './YemSekmesi'
import { OlaylarSekmesi } from './OlaylarSekmesi'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ 'donem-no': string }>
}

export default async function SuruDetayPage({ params }: Props) {
  const { 'donem-no': donemNo } = await params
  const { error, data } = await getSuruDonemByNo(donemNo)

  if (error) {
    return (
      <div className="p-6">
        <Link href="/suru" className="text-sm text-indigo-600">
          ← Sürü listesine dön
        </Link>
        <div className="mt-4 rounded border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">
          Hata: {error}
        </div>
      </div>
    )
  }

  if (!data) {
    notFound()
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <Link href="/suru" className="text-sm text-indigo-600">
          ← Sürü listesine dön
        </Link>
      </div>

      <SuruDetayBant donem={data} bloklar={data.bloklar} />

      <SuruSekmeleri
        ozet={<OzetSekmesi donem={data} />}
        tarti={<TartiSekmesi donemId={data.id} tartilar={data.tartilar} />}
        olum={<OlumSekmesi donemId={data.id} olumler={data.olumler} />}
        yem={<YemSekmesi donemId={data.id} yemler={data.yemler} />}
        olaylar={<OlaylarSekmesi donemId={data.id} />}
      />
    </div>
  )
}
