'use client'

import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DurumBadge } from '../DurumBadge'
import { hesaplaDurum } from '@/lib/odemeler/durum'
import type { Odeme, OdemeDurum } from '@/types/odemeler'

type Props = {
  odemeler: Odeme[]
}

const AY_ADI = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

const GUN_ADI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const DOT_COLOR: Record<OdemeDurum, string> = {
  odendi: 'bg-emerald-500',
  yaklasan: 'bg-amber-500',
  gecikmis: 'bg-rose-500',
  beklemede: 'bg-slate-400',
}

export function OdemeTakvimi({ odemeler }: Props) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const bugun = useMemo(() => new Date(), [])
  const yil = anchor.getFullYear()
  const ay = anchor.getMonth()

  // Ay başının pazartesi-tabanlı offset'i (Pzt=0..Paz=6)
  const ilkGun = new Date(yil, ay, 1)
  const ilkGunHaftasi = (ilkGun.getDay() + 6) % 7 // 0=Pzt
  const sonGun = new Date(yil, ay + 1, 0).getDate()

  // 6 hafta = 42 hücre
  const cells: { tarih: Date | null; iso: string }[] = []
  for (let i = 0; i < 42; i++) {
    const dayNum = i - ilkGunHaftasi + 1
    if (dayNum < 1 || dayNum > sonGun) {
      cells.push({ tarih: null, iso: '' })
    } else {
      const dt = new Date(yil, ay, dayNum)
      cells.push({
        tarih: dt,
        iso: `${yil}-${String(ay + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
      })
    }
  }

  // Tarihten ödemelere haritala
  const map = useMemo(() => {
    const m = new Map<string, (Odeme & { _durum: OdemeDurum })[]>()
    for (const o of odemeler) {
      const arr = m.get(o.vade_tarihi) ?? []
      arr.push({ ...o, _durum: hesaplaDurum(o, bugun) })
      m.set(o.vade_tarihi, arr)
    }
    return m
  }, [odemeler, bugun])

  function shift(delta: number) {
    setAnchor(new Date(yil, ay + delta, 1))
  }

  function bugune() {
    const d = new Date()
    setAnchor(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => shift(-1)} className="border rounded px-2 py-1 text-sm">
          ‹
        </button>
        <div className="font-semibold text-lg">
          {AY_ADI[ay]} {yil}
        </div>
        <button onClick={() => shift(1)} className="border rounded px-2 py-1 text-sm">
          ›
        </button>
        <button onClick={bugune} className="border rounded px-3 py-1 text-sm ml-2">
          Bugüne git
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <Legend color="bg-emerald-500" label="Ödendi" />
          <Legend color="bg-amber-500" label="Yaklaşan" />
          <Legend color="bg-rose-500" label="Gecikmiş" />
          <Legend color="bg-slate-400" label="Beklemede" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-md overflow-hidden border">
        {GUN_ADI.map((g) => (
          <div key={g} className="bg-slate-50 text-xs font-medium px-2 py-1 text-center">
            {g}
          </div>
        ))}
        {cells.map((c, i) => {
          if (!c.tarih) {
            return <div key={i} className="bg-slate-50 min-h-[80px]" />
          }
          const items = map.get(c.iso) ?? []
          const isToday =
            c.tarih.getFullYear() === bugun.getFullYear() &&
            c.tarih.getMonth() === bugun.getMonth() &&
            c.tarih.getDate() === bugun.getDate()

          if (items.length === 0) {
            return (
              <div
                key={i}
                className={`bg-white min-h-[80px] p-1 text-xs ${
                  isToday ? 'ring-2 ring-indigo-400 ring-inset' : ''
                }`}
              >
                <span className="text-muted-foreground">{c.tarih.getDate()}</span>
              </div>
            )
          }

          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  className={`bg-white min-h-[80px] p-1 text-xs text-left hover:bg-slate-50 w-full ${
                    isToday ? 'ring-2 ring-indigo-400 ring-inset' : ''
                  }`}
                >
                  <div className="font-medium">{c.tarih.getDate()}</div>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {items.slice(0, 6).map((o) => (
                      <span
                        key={o.id}
                        className={`inline-block h-2 w-2 rounded-full ${DOT_COLOR[o._durum]}`}
                      />
                    ))}
                    {items.length > 6 && (
                      <span className="text-[10px] text-muted-foreground ml-0.5">
                        +{items.length - 6}
                      </span>
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="font-semibold text-sm mb-2">
                  {c.tarih.getDate()} {AY_ADI[ay]} {yil}
                </div>
                <ul className="space-y-2 max-h-72 overflow-auto">
                  {items.map((o) => (
                    <li key={o.id} className="flex items-start gap-2 text-sm border-b pb-2 last:border-0">
                      <DurumBadge durum={o._durum} />
                      <div className="flex-1">
                        <div className="font-medium">{o.aciklama}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.kategori?.isim ?? '—'} · {o.kime ?? '—'}
                        </div>
                      </div>
                      <div className="font-mono text-sm">
                        {Number(o.tutar).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ₺
                      </div>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          )
        })}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}
