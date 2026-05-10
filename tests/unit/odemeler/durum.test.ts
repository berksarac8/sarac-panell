import { describe, it, expect } from 'vitest'
import { hesaplaDurum } from '@/lib/odemeler/durum'
import type { Odeme } from '@/types/odemeler'

const baseOdeme: Omit<Odeme, 'vade_tarihi' | 'odeme_tarihi' | 'odendi_mi'> = {
  id: 'x',
  aciklama: 't',
  kategori_id: null,
  tutar: 100,
  kime: null,
  notlar: null,
  tekrar_grubu_id: null,
  olusturan: 'u',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const bugun = new Date('2026-05-10T12:00:00Z')

describe('hesaplaDurum', () => {
  it('ödeme tarihi varsa "odendi" döner', () => {
    const o: Odeme = {
      ...baseOdeme,
      vade_tarihi: '2026-05-15',
      odeme_tarihi: '2026-05-09',
      odendi_mi: true,
    }
    expect(hesaplaDurum(o, bugun)).toBe('odendi')
  })

  it('vade < bugün ve ödenmemiş → "gecikmis"', () => {
    const o: Odeme = {
      ...baseOdeme,
      vade_tarihi: '2026-05-09',
      odeme_tarihi: null,
      odendi_mi: false,
    }
    expect(hesaplaDurum(o, bugun)).toBe('gecikmis')
  })

  it('vade bugün → "yaklasan" (0 gün)', () => {
    const o: Odeme = {
      ...baseOdeme,
      vade_tarihi: '2026-05-10',
      odeme_tarihi: null,
      odendi_mi: false,
    }
    expect(hesaplaDurum(o, bugun)).toBe('yaklasan')
  })

  it('vade 7 gün sonrası → "yaklasan"', () => {
    const o: Odeme = {
      ...baseOdeme,
      vade_tarihi: '2026-05-17',
      odeme_tarihi: null,
      odendi_mi: false,
    }
    expect(hesaplaDurum(o, bugun)).toBe('yaklasan')
  })

  it('vade 8 gün sonrası → "beklemede"', () => {
    const o: Odeme = {
      ...baseOdeme,
      vade_tarihi: '2026-05-18',
      odeme_tarihi: null,
      odendi_mi: false,
    }
    expect(hesaplaDurum(o, bugun)).toBe('beklemede')
  })

  it('vade çok ileri ödendi → "odendi" baskın', () => {
    const o: Odeme = {
      ...baseOdeme,
      vade_tarihi: '2027-01-01',
      odeme_tarihi: '2026-05-01',
      odendi_mi: true,
    }
    expect(hesaplaDurum(o, bugun)).toBe('odendi')
  })
})
