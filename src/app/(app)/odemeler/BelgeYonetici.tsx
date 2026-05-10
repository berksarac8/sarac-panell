'use client'

import * as React from 'react'
import { useEffect, useState, useTransition } from 'react'
import {
  listOdemeBelgeleri,
  uploadOdemeBelge,
  deleteOdemeBelge,
  getBelgeIndirmeUrl,
} from '@/lib/actions/odeme-belgeler'
import type { OdemeBelge } from '@/types/odemeler'

type Props = {
  odemeId: string
}

const MAX_BOYUT = 10 * 1024 * 1024

/**
 * OdemeDialog içinde kullanılan belge yönetim alanı.
 * - Drag & drop veya dosya seçici
 * - Mevcut belgelerin listesi (indir / sil)
 * - 10MB sınırı client tarafında da kontrol edilir
 */
export function BelgeYonetici({ odemeId }: Props) {
  const [belgeler, setBelgeler] = useState<OdemeBelge[]>([])
  const [yukle, setYukle] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [siliniyor, setSiliniyor] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [drag, setDrag] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    let aktif = true
    listOdemeBelgeleri(odemeId).then((res) => {
      if (!aktif) return
      if ('error' in res && res.error) {
        setHata(res.error)
      }
      setBelgeler(res.data)
    })
    return () => {
      aktif = false
    }
  }, [odemeId])

  async function dosyaYukle(file: File) {
    setHata(null)
    if (file.size > MAX_BOYUT) {
      setHata('Dosya 10MB sınırını aşıyor')
      return
    }
    setYukle(true)
    const fd = new FormData()
    fd.set('odeme_id', odemeId)
    fd.set('dosya', file)
    const res = await uploadOdemeBelge(fd)
    setYukle(false)
    if ('error' in res && res.error) {
      setHata(res.error)
      return
    }
    // listeyi yenile
    const yeni = await listOdemeBelgeleri(odemeId)
    if (!('error' in yeni) || !yeni.error) {
      setBelgeler(yeni.data)
    }
  }

  function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      void dosyaYukle(f)
      e.target.value = ''
    }
  }

  function dropHandler(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void dosyaYukle(f)
  }

  function sil(belgeId: string) {
    if (!confirm('Bu belgeyi silmek istediğine emin misin?')) return
    setSiliniyor(belgeId)
    startTransition(async () => {
      const res = await deleteOdemeBelge(belgeId)
      setSiliniyor(null)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setBelgeler((prev) => prev.filter((b) => b.id !== belgeId))
    })
  }

  async function indir(belgeId: string) {
    setHata(null)
    const res = await getBelgeIndirmeUrl(belgeId)
    if ('error' in res && res.error) {
      setHata(res.error)
      return
    }
    if ('url' in res && res.url) {
      window.open(res.url, '_blank', 'noopener')
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Belgeler (fatura/çek/foto)</div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={dropHandler}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-md px-3 py-4 text-center text-xs cursor-pointer transition-colors ${
          drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'
        }`}
      >
        {yukle ? (
          <span className="text-slate-500">Yükleniyor…</span>
        ) : (
          <>
            <span className="text-slate-700">Dosya sürükle-bırak</span>
            <span className="text-slate-500"> veya seç (maks. 10MB)</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={dosyaSecildi}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        />
      </div>

      {hata && <p className="text-xs text-rose-600">{hata}</p>}

      {belgeler.length > 0 && (
        <ul className="space-y-1">
          {belgeler.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-2 text-xs bg-slate-50 rounded px-2 py-1"
            >
              <span aria-hidden>📎</span>
              <button
                type="button"
                onClick={() => indir(b.id)}
                className="flex-1 text-left truncate text-indigo-700 hover:underline"
                title={b.dosya_adi}
              >
                {b.dosya_adi}
              </button>
              <span className="text-slate-500 font-mono shrink-0">
                {formatBoyut(b.boyut)}
              </span>
              <button
                type="button"
                onClick={() => sil(b.id)}
                disabled={pending && siliniyor === b.id}
                className="text-rose-600 hover:underline shrink-0 disabled:opacity-50"
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatBoyut(byte: number): string {
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`
}
