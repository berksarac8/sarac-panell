import { describe, it, expect } from 'vitest'
import { uretTekrarVadeleri } from '@/lib/odemeler/tekrar'

describe('uretTekrarVadeleri', () => {
  it('aylık 12 → 12 adet, ay ay artar', () => {
    const v = uretTekrarVadeleri('2026-01-15', 'aylik', 12)
    expect(v).toHaveLength(12)
    expect(v[0]).toBe('2026-01-15')
    expect(v[1]).toBe('2026-02-15')
    expect(v[11]).toBe('2026-12-15')
  })

  it('aylık 31 Ocak → ay sonuna sıkışır (28 Şubat)', () => {
    const v = uretTekrarVadeleri('2026-01-31', 'aylik', 3)
    expect(v[0]).toBe('2026-01-31')
    expect(v[1]).toBe('2026-02-28')
    expect(v[2]).toBe('2026-03-31')
  })

  it('haftalık 4 → 4 adet, 7 gün arayla', () => {
    const v = uretTekrarVadeleri('2026-05-10', 'haftalik', 4)
    expect(v).toEqual(['2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31'])
  })

  it('yıllık 3 → 3 adet, yıl ekler', () => {
    const v = uretTekrarVadeleri('2026-03-01', 'yillik', 3)
    expect(v).toEqual(['2026-03-01', '2027-03-01', '2028-03-01'])
  })

  it('tekrar_sayisi=1 → tek tarih', () => {
    const v = uretTekrarVadeleri('2026-05-10', 'aylik', 1)
    expect(v).toEqual(['2026-05-10'])
  })

  it('tekrar_sayisi<1 → boş dizi', () => {
    expect(uretTekrarVadeleri('2026-05-10', 'aylik', 0)).toEqual([])
  })
})
