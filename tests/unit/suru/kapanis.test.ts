import { describe, it, expect } from 'vitest'
import { hesaplaDonemDurumu } from '@/lib/suru/kapanis'
import type { SuruBlok } from '@/types/suru'

function blok(blok_no: 1 | 2 | 3, cikis_tarihi: string | null): SuruBlok {
  return {
    id: `b${blok_no}`,
    donem_id: 'd',
    blok_no,
    giris_adedi: 1000,
    cikis_tarihi,
    cikis_adedi: cikis_tarihi ? 950 : null,
    cikis_kg: cikis_tarihi ? 2200 : null,
  }
}

describe('hesaplaDonemDurumu', () => {
  it('hiçbir blok kapanmadıysa "aktif"', () => {
    const bloklar: SuruBlok[] = [blok(1, null), blok(2, null), blok(3, null)]
    expect(hesaplaDonemDurumu(bloklar)).toBe('aktif')
  })

  it('1 blok kapandıysa "aktif"', () => {
    const bloklar: SuruBlok[] = [blok(1, '2026-05-01'), blok(2, null), blok(3, null)]
    expect(hesaplaDonemDurumu(bloklar)).toBe('aktif')
  })

  it('2 blok kapandıysa "aktif"', () => {
    const bloklar: SuruBlok[] = [
      blok(1, '2026-05-01'),
      blok(2, '2026-05-02'),
      blok(3, null),
    ]
    expect(hesaplaDonemDurumu(bloklar)).toBe('aktif')
  })

  it('3 blok da kapandıysa "kapali"', () => {
    const bloklar: SuruBlok[] = [
      blok(1, '2026-05-01'),
      blok(2, '2026-05-02'),
      blok(3, '2026-05-03'),
    ]
    expect(hesaplaDonemDurumu(bloklar)).toBe('kapali')
  })

  it('boş bloklar dizisi → "aktif" (hiçbir blok kapanmamış sayılır)', () => {
    expect(hesaplaDonemDurumu([])).toBe('aktif')
  })

  it('blok sayısı 3den az ama hepsi kapalıysa "aktif" (eksik blok)', () => {
    const bloklar: SuruBlok[] = [blok(1, '2026-05-01'), blok(2, '2026-05-02')]
    expect(hesaplaDonemDurumu(bloklar)).toBe('aktif')
  })
})
