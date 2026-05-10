'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { OdemeKategori, OdemeDurum } from '@/types/odemeler'
import { DURUM_LABEL } from '@/lib/odemeler/durum'

const ALL_DURUMLAR: OdemeDurum[] = ['beklemede', 'yaklasan', 'gecikmis', 'odendi']

export function FiltreCubugu({ kategoriler }: { kategoriler: OdemeKategori[] }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [kategoriIds, setKategoriIds] = useState<string[]>(
    sp.get('kategori')?.split(',').filter(Boolean) ?? []
  )
  const [durumlar, setDurumlar] = useState<OdemeDurum[]>(
    (sp.get('durum')?.split(',').filter(Boolean) ?? []) as OdemeDurum[]
  )
  const [bas, setBas] = useState(sp.get('bas') ?? '')
  const [bit, setBit] = useState(sp.get('bit') ?? '')
  const [arama, setArama] = useState(sp.get('q') ?? '')

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
  }

  function uygula() {
    const params = new URLSearchParams()
    if (kategoriIds.length) params.set('kategori', kategoriIds.join(','))
    if (durumlar.length) params.set('durum', durumlar.join(','))
    if (bas) params.set('bas', bas)
    if (bit) params.set('bit', bit)
    if (arama.trim()) params.set('q', arama.trim())
    startTransition(() => {
      const qs = params.toString()
      router.push(qs ? `?${qs}` : '?')
    })
  }

  function temizle() {
    setKategoriIds([])
    setDurumlar([])
    setBas('')
    setBit('')
    setArama('')
    startTransition(() => router.push('?'))
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3">
      <div>
        <label className="text-xs text-muted-foreground">Kategori</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {kategoriler.map((k) => {
            const active = kategoriIds.includes(k.id)
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKategoriIds(toggle(kategoriIds, k.id))}
                className={`text-xs px-2 py-1 rounded-full border ${
                  active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'
                }`}
              >
                {k.isim}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Durum</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {ALL_DURUMLAR.map((d) => {
            const active = durumlar.includes(d)
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDurumlar(toggle(durumlar, d))}
                className={`text-xs px-2 py-1 rounded-full border ${
                  active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'
                }`}
              >
                {DURUM_LABEL[d]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Vade ≥</label>
        <input
          type="date"
          value={bas}
          onChange={(e) => setBas(e.target.value)}
          className="block mt-1 text-sm border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Vade ≤</label>
        <input
          type="date"
          value={bit}
          onChange={(e) => setBit(e.target.value)}
          className="block mt-1 text-sm border rounded px-2 py-1"
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-muted-foreground">Arama (açıklama / kime)</label>
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') uygula()
          }}
          className="block w-full mt-1 text-sm border rounded px-2 py-1"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={uygula}
          disabled={pending}
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          Uygula
        </button>
        <button
          type="button"
          onClick={temizle}
          disabled={pending}
          className="text-sm border px-3 py-1.5 rounded-md"
        >
          Temizle
        </button>
      </div>
    </div>
  )
}
