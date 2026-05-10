'use client'

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

export function OlayKart({
  olay,
  onClick,
}: {
  olay: CiftlikOlay
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-card border rounded-md p-3 hover:shadow-sm hover:border-indigo-300 transition"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-mono text-muted-foreground">{trDate(olay.tarih)}</span>
        {olay.kategori && (
          <Badge variant="info">{olay.kategori.isim}</Badge>
        )}
        {olay.donem && (
          <Badge variant="muted">{olay.donem.donem_no}</Badge>
        )}
      </div>
      <div className="font-semibold text-sm">{olay.baslik}</div>
      {olay.aciklama && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{olay.aciklama}</p>
      )}
      {olay.kisi_firma && (
        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-medium">Kişi/Firma:</span> {olay.kisi_firma}
        </p>
      )}
    </button>
  )
}
