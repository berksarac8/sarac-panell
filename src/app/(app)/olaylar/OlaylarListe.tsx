'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OlayKart } from './OlayKart'
import { OlayDialog } from './OlayDialog'
import type { CiftlikOlay, OlayKategori, SuruDonemRef } from '@/types/olaylar'

type Props = {
  olaylar: CiftlikOlay[]
  kategoriler: OlayKategori[]
  donemler: SuruDonemRef[]
  aktifDonem: SuruDonemRef | null
}

export function OlaylarListe({ olaylar, kategoriler, donemler, aktifDonem }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [duzenle, setDuzenle] = useState<CiftlikOlay | null>(null)

  // URL bazlı filtreler — server zaten filtreliyor; bu UI sadece form
  const [kategoriIds, setKategoriIds] = useState<string[]>(
    sp.get('kategori')?.split(',').filter(Boolean) ?? []
  )
  const [bas, setBas] = useState(sp.get('bas') ?? '')
  const [bit, setBit] = useState(sp.get('bit') ?? '')
  const [donemId, setDonemId] = useState(sp.get('donem') ?? '')
  const [arama, setArama] = useState(sp.get('q') ?? '')

  function toggleKategori(id: string) {
    setKategoriIds(kategoriIds.includes(id) ? kategoriIds.filter((x) => x !== id) : [...kategoriIds, id])
  }

  function uygula() {
    const params = new URLSearchParams()
    if (kategoriIds.length) params.set('kategori', kategoriIds.join(','))
    if (bas) params.set('bas', bas)
    if (bit) params.set('bit', bit)
    if (donemId) params.set('donem', donemId)
    if (arama.trim()) params.set('q', arama.trim())
    startTransition(() => {
      const qs = params.toString()
      router.push(qs ? `?${qs}` : '?')
    })
  }

  function temizle() {
    setKategoriIds([])
    setBas('')
    setBit('')
    setDonemId('')
    setArama('')
    startTransition(() => router.push('?'))
  }

  const gruplu = useMemo(() => {
    // Tarihe göre grupla (en yeni → eski)
    const m = new Map<string, CiftlikOlay[]>()
    for (const o of olaylar) {
      const arr = m.get(o.tarih) ?? []
      arr.push(o)
      m.set(o.tarih, arr)
    }
    return Array.from(m.entries()).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [olaylar])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold">Olaylar ({olaylar.length})</h2>
        <OlayDialog
          kategoriler={kategoriler}
          donemler={donemler}
          aktifDonem={aktifDonem}
          trigger={
            <button className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md">
              + Yeni Olay
            </button>
          }
        />
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3">
        <div>
          <label className="text-xs text-muted-foreground">Kategori</label>
          <div className="flex flex-wrap gap-1 mt-1 max-w-md">
            {kategoriler.map((k) => {
              const active = kategoriIds.includes(k.id)
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => toggleKategori(k.id)}
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
          <label className="text-xs text-muted-foreground">Tarih ≥</label>
          <input
            type="date"
            value={bas}
            onChange={(e) => setBas(e.target.value)}
            className="block mt-1 text-sm border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tarih ≤</label>
          <input
            type="date"
            value={bit}
            onChange={(e) => setBit(e.target.value)}
            className="block mt-1 text-sm border rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Sürü dönemi</label>
          <select
            value={donemId}
            onChange={(e) => setDonemId(e.target.value)}
            className="block mt-1 text-sm border rounded px-2 py-1"
          >
            <option value="">Hepsi</option>
            {donemler.map((d) => (
              <option key={d.id} value={d.id}>
                {d.donem_no}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted-foreground">Arama</label>
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

      {olaylar.length === 0 && (
        <div className="text-center text-muted-foreground py-12 border rounded-md bg-card">
          Kayıt yok.
        </div>
      )}

      <div className="space-y-6">
        {gruplu.map(([tarih, items]) => (
          <div key={tarih}>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((o) => (
                <OlayKart key={o.id} olay={o} onClick={() => setDuzenle(o)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {duzenle && (
        <OlayDialog
          kategoriler={kategoriler}
          donemler={donemler}
          aktifDonem={aktifDonem}
          duzenle={duzenle}
          defaultOpen
          onClose={() => setDuzenle(null)}
          trigger={<span style={{ display: 'none' }} />}
        />
      )}
    </div>
  )
}
