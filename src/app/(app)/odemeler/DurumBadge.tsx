import { Badge } from '@/components/ui/badge'
import { DURUM_LABEL, DURUM_RENK } from '@/lib/odemeler/durum'
import type { OdemeDurum } from '@/types/odemeler'

const DOT_COLOR: Record<OdemeDurum, string> = {
  odendi: 'bg-emerald-500',
  yaklasan: 'bg-amber-500',
  gecikmis: 'bg-rose-500',
  beklemede: 'bg-slate-400',
}

export function DurumBadge({ durum }: { durum: OdemeDurum }) {
  return (
    <Badge variant={DURUM_RENK[durum]}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLOR[durum]}`} />
      {DURUM_LABEL[durum]}
    </Badge>
  )
}
