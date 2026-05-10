'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DurumBadge } from './odemeler/DurumBadge'
import { markPaid } from '@/lib/actions/odemeler'
import type { Odeme, OdemeDurum } from '@/types/odemeler'

type Props = {
  odemeler: (Odeme & { _durum: OdemeDurum })[]
}

export function AcilOdemelerWidget({ odemeler }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function islemMarkPaid(id: string) {
    startTransition(async () => {
      await markPaid(id)
      router.refresh()
    })
  }

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Yaklaşan & Gecikmiş Ödemeler</h2>
        <Link
          href="/odemeler?durum=gecikmis,yaklasan"
          className="text-xs text-indigo-600 hover:underline"
        >
          Tüm ödemeler →
        </Link>
      </header>

      {odemeler.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Yaklaşan veya gecikmiş ödeme yok. ✓
        </div>
      ) : (
        <ul className="divide-y">
          {odemeler.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
            >
              <DurumBadge durum={o._durum} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{o.aciklama}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {o.kategori?.isim ? `${o.kategori.isim} · ` : ''}
                  Vade: <span className="font-mono">{o.vade_tarihi}</span>
                  {o.kime ? ` · ${o.kime}` : ''}
                </div>
              </div>
              <div className="text-sm font-mono text-right whitespace-nowrap">
                {Number(o.tutar).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₺
              </div>
              <button
                type="button"
                onClick={() => islemMarkPaid(o.id)}
                disabled={pending}
                className="text-xs px-2 py-1 border rounded text-emerald-700 border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
              >
                Ödendi
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
