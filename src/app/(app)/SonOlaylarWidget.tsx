import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { CiftlikOlay } from '@/types/olaylar'

const AY = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
]

function trDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${AY[m - 1]} ${y}`
}

export function SonOlaylarWidget({ olaylar }: { olaylar: CiftlikOlay[] }) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Son Olaylar</h2>
        <Link href="/olaylar" className="text-xs text-indigo-600 hover:underline">
          Tüm olaylar →
        </Link>
      </header>

      {olaylar.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Henüz olay kaydı yok.
        </div>
      ) : (
        <ul className="divide-y">
          {olaylar.map((o) => (
            <li key={o.id} className="px-4 py-2.5 hover:bg-slate-50">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-muted-foreground">
                  {trDate(o.tarih)}
                </span>
                {o.kategori && <Badge variant="info">{o.kategori.isim}</Badge>}
                {o.donem && <Badge variant="muted">{o.donem.donem_no}</Badge>}
              </div>
              <div className="text-sm font-medium">{o.baslik}</div>
              {o.kisi_firma && (
                <div className="text-xs text-muted-foreground">{o.kisi_firma}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
