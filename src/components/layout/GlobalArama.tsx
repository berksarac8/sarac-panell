'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { globalArama, type AramaSonuc, type AramaSonucTip } from '@/lib/actions/arama'

function tipIkon(tip: AramaSonucTip): string {
  switch (tip) {
    case 'odeme':
      return '💳'
    case 'olay':
      return '📋'
    case 'suru':
      return '🐔'
  }
}

function tipEtiket(tip: AramaSonucTip): string {
  switch (tip) {
    case 'odeme':
      return 'Ödeme'
    case 'olay':
      return 'Olay'
    case 'suru':
      return 'Sürü'
  }
}

export function GlobalArama() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<AramaSonuc[]>([])
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // "Store-previous-value during render" pattern (React docs):
  // q yetersizse veya kapalıysa results'ı senkron olarak temizle.
  const yetersiz = !open || q.trim().length < 2
  if (yetersiz && results.length > 0) {
    setResults([])
  }
  if (yetersiz && highlightIdx !== 0) {
    setHighlightIdx(0)
  }

  // Ctrl/Cmd+K shortcut + ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Focus input when opened (DOM side-effect — setState değil)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  // Debounce search — sadece q yeterliyse fetch yap.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!open || q.trim().length < 2) return
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalArama(q)
        if (!res.error) {
          setResults(res.data)
          setHighlightIdx(0)
        }
      })
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q, open])

  function close() {
    setOpen(false)
    setQ('')
  }

  function navigate(item: AramaSonuc) {
    close()
    router.push(item.link)
  }

  function onKeyInput(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const sel = results[highlightIdx]
      if (sel) navigate(sel)
    }
  }

  // Tek tetikleyici (search ikonlu buton — AppShell'in sağ üstüne yerleşir)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 h-10 rounded-md border border-rule-soft bg-card hover:bg-surface-deep text-sm text-ink-muted transition-colors min-w-[200px]"
        aria-label="Ara"
      >
        <span>🔍</span>
        <span className="flex-1 text-left">Ara…</span>
        <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-rule-soft text-ink-muted bg-surface-deep">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden w-10 h-10 rounded-md hover:bg-surface-deep flex items-center justify-center text-lg"
        aria-label="Ara"
        title="Ara"
      >
        🔍
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
          onClick={close}
        >
          <div
            className="w-full max-w-xl bg-card rounded-xl border border-rule shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 border-b border-rule-soft">
              <span className="text-lg">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyInput}
                placeholder="Ödeme, olay veya sürü ara… (en az 2 karakter)"
                className="flex-1 py-3 bg-transparent outline-none text-base placeholder:text-ink-muted"
              />
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rule-soft text-ink-muted">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {pending && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Aranıyor…
                </div>
              )}
              {!pending && q.trim().length >= 2 && results.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Sonuç bulunamadı.
                </div>
              )}
              {!pending && q.trim().length < 2 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Arama için en az 2 karakter girin. Ödemelerde açıklama/kime,
                  olaylarda başlık/açıklama, sürülerde dönem no/notlar aranır.
                </div>
              )}
              {!pending && results.length > 0 && (
                <ul className="py-1">
                  {results.map((r, idx) => (
                    <li key={`${r.tip}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => navigate(r)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                          idx === highlightIdx
                            ? 'bg-brand-soft'
                            : 'hover:bg-surface-deep'
                        }`}
                      >
                        <span className="text-lg flex-shrink-0 mt-0.5">
                          {tipIkon(r.tip)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-muted">
                              {tipEtiket(r.tip)}
                            </span>
                          </div>
                          <div className="text-sm font-medium truncate">
                            {r.baslik}
                          </div>
                          {r.ek_bilgi && (
                            <div className="text-xs text-ink-muted truncate">
                              {r.ek_bilgi}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-rule-soft bg-surface-deep/50 text-[11px] text-ink-muted flex items-center justify-between">
              <span>
                <kbd className="font-mono">↑↓</kbd> gezin •{' '}
                <kbd className="font-mono">Enter</kbd> seç
              </span>
              <span>{results.length} sonuç</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
