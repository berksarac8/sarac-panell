'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  listBildirimler,
  markBildirimOkundu,
  markAllBildirimOkundu,
} from '@/lib/actions/bildirimler'
import type { Bildirim, BildirimTip } from '@/types/bildirimler'

function ikon(tip: BildirimTip): string {
  switch (tip) {
    case 'odeme_yaklasan':
      return '⏰'
    case 'odeme_gecikmis':
      return '⚠️'
    case 'suru_kapanis_yaklasan':
      return '🐔'
    case 'eksik_gun':
      return '📋'
    case 'sistem':
    default:
      return '🔔'
  }
}

function renkSinifi(tip: BildirimTip): string {
  switch (tip) {
    case 'odeme_gecikmis':
      return 'border-l-danger'
    case 'odeme_yaklasan':
      return 'border-l-warning'
    case 'suru_kapanis_yaklasan':
      return 'border-l-info'
    case 'eksik_gun':
      return 'border-l-accent2'
    case 'sistem':
    default:
      return 'border-l-brand'
  }
}

function zamanFmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'az önce'
  if (diffMin < 60) return `${diffMin} dk`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} sa`
  const diffGun = Math.floor(diffHr / 24)
  if (diffGun < 7) return `${diffGun} gün`
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

export function BildirimDropdown() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Bildirim[]>([])
  const [okunmamis, setOkunmamis] = useState(0)
  const [pending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  // İlk yükleme (badge için) + dropdown açıldığında tazele
  useEffect(() => {
    // Mount + open değişimi → yeniden çek
    let cancelled = false
    async function doFetch() {
      const res = await listBildirimler(false)
      if (cancelled) return
      startTransition(() => {
        if (!res.error) {
          setData(res.data)
          setOkunmamis(res.okunmamisSayi)
        }
        setLoaded(true)
      })
    }
    doFetch()
    return () => {
      cancelled = true
    }
  }, [open])

  // Dış tıklama → kapat
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-bildirim-root]')) {
        setOpen(false)
      }
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [open])

  function islemMark(id: string) {
    startTransition(async () => {
      const res = await markBildirimOkundu(id)
      if (res.ok) {
        setData((prev) =>
          prev.map((b) => (b.id === id ? { ...b, okundu_mu: true } : b))
        )
        setOkunmamis((n) => Math.max(0, n - 1))
        router.refresh()
      }
    })
  }

  function islemMarkAll() {
    startTransition(async () => {
      const res = await markAllBildirimOkundu()
      if (res.ok) {
        setData((prev) => prev.map((b) => ({ ...b, okundu_mu: true })))
        setOkunmamis(0)
        router.refresh()
      }
    })
  }

  return (
    <div className="relative" data-bildirim-root>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-md hover:bg-surface-deep flex items-center justify-center text-lg transition-colors"
        aria-label="Bildirimler"
        title="Bildirimler"
      >
        <span>🔔</span>
        {okunmamis > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {okunmamis > 9 ? '9+' : okunmamis}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-[calc(100vw-1rem)] max-w-sm rounded-lg border border-rule bg-card shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-rule-soft bg-surface-deep/50">
            <div className="text-sm font-semibold">Bildirimler</div>
            {okunmamis > 0 && (
              <button
                type="button"
                onClick={islemMarkAll}
                disabled={pending}
                className="text-xs text-brand hover:underline disabled:opacity-50"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!loaded ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Yükleniyor…
              </div>
            ) : data.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Henüz bildirim yok.
              </div>
            ) : (
              <ul className="divide-y divide-rule-soft">
                {data.slice(0, 10).map((b) => {
                  const Inner = (
                    <div className="flex items-start gap-2.5 w-full text-left">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {ikon(b.tip)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium ${b.okundu_mu ? 'text-ink-soft' : 'text-ink'}`}
                        >
                          {b.baslik}
                        </div>
                        {b.mesaj && (
                          <div className="text-xs text-ink-muted mt-0.5 line-clamp-2">
                            {b.mesaj}
                          </div>
                        )}
                        <div className="text-[11px] text-ink-muted mt-1">
                          {zamanFmt(b.created_at)}
                        </div>
                      </div>
                      {!b.okundu_mu && (
                        <span
                          className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1.5"
                          aria-label="Okunmamış"
                        />
                      )}
                    </div>
                  )

                  return (
                    <li
                      key={b.id}
                      className={`border-l-2 ${renkSinifi(b.tip)} ${b.okundu_mu ? 'bg-transparent' : 'bg-brand-soft/30'}`}
                    >
                      {b.link ? (
                        <Link
                          href={b.link}
                          onClick={() => {
                            if (!b.okundu_mu) islemMark(b.id)
                            setOpen(false)
                          }}
                          className="block px-3 py-2.5 hover:bg-surface-deep transition-colors"
                        >
                          {Inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!b.okundu_mu) islemMark(b.id)
                          }}
                          className="block w-full px-3 py-2.5 hover:bg-surface-deep transition-colors"
                        >
                          {Inner}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
