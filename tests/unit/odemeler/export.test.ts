import { describe, it, expect } from 'vitest'
import { odemelerToCsv, csvEscape, formatTutar } from '@/lib/odemeler/export'
import type { Odeme } from '@/types/odemeler'

function mkOdeme(over: Partial<Odeme> = {}): Odeme {
  return {
    id: 'o1',
    aciklama: 'Test ödeme',
    kategori_id: 'k1',
    kategori: { id: 'k1', isim: 'Fatura', renk: '#6366f1' },
    tutar: 1234.56,
    vade_tarihi: '2026-05-10',
    kime: 'Tedarikçi A',
    notlar: null,
    odendi_mi: false,
    odeme_tarihi: null,
    tekrar_grubu_id: null,
    olusturan: 'u1',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...over,
  }
}

describe('csvEscape', () => {
  it('virgül içeren değeri quote eder', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
  })

  it('tırnak içeren değerde tırnağı ikiler ve sarar', () => {
    expect(csvEscape('a"b')).toBe('"a""b"')
  })

  it('satır sonu içeren değeri quote eder', () => {
    expect(csvEscape('a\nb')).toBe('"a\nb"')
    expect(csvEscape('a\r\nb')).toBe('"a\r\nb"')
  })

  it('düz değeri quote etmez', () => {
    expect(csvEscape('basit metin')).toBe('basit metin')
  })

  it('null/undefined → boş string', () => {
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
  })
})

describe('formatTutar', () => {
  it('tr-TR formatında 2 ondalık', () => {
    expect(formatTutar(1234.56)).toBe('1.234,56')
  })

  it('tam sayı için de 2 ondalık', () => {
    expect(formatTutar(100)).toBe('100,00')
  })

  it('NaN → boş string', () => {
    expect(formatTutar(NaN)).toBe('')
  })
})

describe('odemelerToCsv', () => {
  it('Türkçe header satırını UTF-8 BOM ile başlatır', () => {
    const csv = odemelerToCsv([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe(
      'Açıklama,Kategori,Kime,Tutar (₺),Vade Tarihi,Durum,Ödeme Tarihi,Notlar'
    )
  })

  it('tek ödeme satırını doğru format eder', () => {
    const bugun = new Date(2026, 4, 1) // 1 Mayıs 2026 → vade 10 Mayıs → "yaklasan"
    const csv = odemelerToCsv([mkOdeme()], bugun)
    const lines = csv.slice(1).split('\r\n')
    expect(lines).toHaveLength(2)
    // Tutar 1.234,56 — bu virgül içerdiğinden quote'lanmalı
    expect(lines[1]).toContain('"1.234,56"')
    expect(lines[1]).toContain('Fatura')
    expect(lines[1]).toContain('Tedarikçi A')
    expect(lines[1]).toContain('2026-05-10')
  })

  it('virgül içeren açıklamayı quote eder', () => {
    const csv = odemelerToCsv([
      mkOdeme({ aciklama: 'Çek, Mayıs', kime: 'Ali "Veli" Demir' }),
    ])
    const lines = csv.slice(1).split('\r\n')
    expect(lines[1]).toContain('"Çek, Mayıs"')
    expect(lines[1]).toContain('"Ali ""Veli"" Demir"')
  })

  it('Türkçe karakterler korunur (BOM sayesinde Excel açabilir)', () => {
    const csv = odemelerToCsv([
      mkOdeme({ aciklama: 'şŞğĞüÜçÇıİöÖ', kime: null, notlar: null }),
    ])
    expect(csv).toContain('şŞğĞüÜçÇıİöÖ')
  })

  it('odendi durumunda doğru etiket', () => {
    const csv = odemelerToCsv([
      mkOdeme({ odendi_mi: true, odeme_tarihi: '2026-05-09' }),
    ])
    const lines = csv.slice(1).split('\r\n')
    expect(lines[1]).toContain('Ödendi')
    expect(lines[1]).toContain('2026-05-09')
  })
})
