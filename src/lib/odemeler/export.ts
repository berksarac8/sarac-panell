import type { Odeme } from '@/types/odemeler'
import { hesaplaDurum, DURUM_LABEL } from '@/lib/odemeler/durum'

/**
 * Bir ödemeler dizisini Türkçe header'lı CSV string'ine çevirir.
 *
 * - UTF-8 BOM ile başlar (Excel Türkçe karakter desteği için)
 * - Sütunlar: Açıklama, Kategori, Kime, Tutar, Vade, Durum, Ödeme Tarihi, Notlar
 * - Virgül (,), tırnak ("), satır sonu içeren değerler çift tırnakla quote edilir;
 *   içerideki tırnaklar ikiye katlanır (RFC 4180)
 * - Tutar `tr-TR` formatında 2 ondalık ile yazılır (1.234,56)
 */
export function odemelerToCsv(odemeler: Odeme[], bugun: Date = new Date()): string {
  const BOM = '﻿'
  const headers = [
    'Açıklama',
    'Kategori',
    'Kime',
    'Tutar (₺)',
    'Vade Tarihi',
    'Durum',
    'Ödeme Tarihi',
    'Notlar',
  ]
  const lines: string[] = [headers.map(csvEscape).join(',')]

  for (const o of odemeler) {
    const durum = hesaplaDurum(o, bugun)
    const row = [
      o.aciklama ?? '',
      o.kategori?.isim ?? '',
      o.kime ?? '',
      formatTutar(Number(o.tutar)),
      o.vade_tarihi ?? '',
      DURUM_LABEL[durum],
      o.odeme_tarihi ?? '',
      o.notlar ?? '',
    ]
    lines.push(row.map(csvEscape).join(','))
  }

  // \r\n RFC 4180 uyumu için
  return BOM + lines.join('\r\n')
}

/**
 * CSV alan değerini RFC 4180 kurallarına göre kaçır.
 * - İçinde , " \r \n geçen değerler "..." ile sarılır
 * - İçerideki " karakterleri "" şeklinde ikilenir
 */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s === '') return ''
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Türkçe lokal formatta (1.234,56) sayı.
 * Negatif/NaN durumunu güvene almak için Number.isFinite kontrolü.
 */
export function formatTutar(n: number): string {
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Tarayıcıda CSV string'ini dosyaya indirir.
 * Sadece browser context'te çağrılmalı.
 */
export function downloadCsv(csv: string, filename: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
