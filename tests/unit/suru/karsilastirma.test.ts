import { describe, it, expect } from 'vitest'
import { karsilastirTartilar } from '@/lib/suru/karsilastirma'
import type { SuruTarti } from '@/types/suru'
import type { BlokGunlukMetrik } from '@/types/suru-metrik'

function mkMetrik(
  gun_no: number,
  tarih: string,
  tahmini_ortalama_gr: number | null
): BlokGunlukMetrik {
  return {
    gun_no,
    tarih,
    gunluk_olum: 0,
    gunluk_su_litre: 0,
    kalan_hayvan: 1000,
    hayvan_basina_su_ml: null,
    banvit_su_ml: null,
    beklenen_su_litre: null,
    su_gerceklesme_yuzde: null,
    banvit_yem_gr: null,
    banvit_yem_su_orani: null,
    beklenen_yem_kg: null,
    hayvan_basina_yem_gr: null,
    bizim_cumulative_yem_gr: null,
    banvit_cumulative_yem_gr: null,
    banvit_cumulative_gr: null,
    tahmini_ortalama_gr,
    gunluk_buyume_tahmini_gr: null,
    banvit_gunluk_buyume_gr: null,
    buyume_fark_yuzde: null,
    su_yesil: false,
    buyume_yesil: null,
  }
}

function mkTarti(opts: Partial<SuruTarti> & { id: string; tarih: string; ortalama_kg: number }): SuruTarti {
  return {
    donem_id: 'd1',
    blok_no: 1,
    tartilan_adet: 10,
    ...opts,
  } as SuruTarti
}

describe('karsilastirTartilar', () => {
  it('tartı yoksa boş dizi döner', () => {
    expect(karsilastirTartilar([], [])).toEqual([])
  })

  it('eşleşen günde gerçek > tahmini → pozitif fark', () => {
    const tartilar: SuruTarti[] = [
      mkTarti({ id: 't1', tarih: '2026-01-10', ortalama_kg: 0.2 }),
    ]
    const metrikler = [mkMetrik(10, '2026-01-10', 180)] // 180gr = 0.18 kg

    const sonuc = karsilastirTartilar(tartilar, metrikler, 1)
    expect(sonuc).toHaveLength(1)
    expect(sonuc[0].gercekKg).toBeCloseTo(0.2, 4)
    expect(sonuc[0].tahminiKg).toBeCloseTo(0.18, 4)
    expect(sonuc[0].farkKg).toBeCloseTo(0.02, 4)
    // (0.02 / 0.18) * 100 ≈ 11.111
    expect(sonuc[0].farkYuzde).toBeCloseTo(11.111, 2)
  })

  it('eşleşen günde gerçek < tahmini → negatif fark', () => {
    const tartilar: SuruTarti[] = [
      mkTarti({ id: 't1', tarih: '2026-01-10', ortalama_kg: 0.15 }),
    ]
    const metrikler = [mkMetrik(10, '2026-01-10', 200)] // 0.2 kg

    const sonuc = karsilastirTartilar(tartilar, metrikler, 1)
    expect(sonuc[0].farkKg).toBeCloseTo(-0.05, 4)
    expect(sonuc[0].farkYuzde).toBeCloseTo(-25, 4)
  })

  it('tarih eşleşmiyorsa tahmini null, fark null', () => {
    const tartilar: SuruTarti[] = [
      mkTarti({ id: 't1', tarih: '2026-01-15', ortalama_kg: 0.3 }),
    ]
    const metrikler = [mkMetrik(10, '2026-01-10', 200)]

    const sonuc = karsilastirTartilar(tartilar, metrikler, 1)
    expect(sonuc[0].tahminiKg).toBeNull()
    expect(sonuc[0].farkKg).toBeNull()
    expect(sonuc[0].farkYuzde).toBeNull()
  })

  it('farklı blok tartılarını filtreler (blokNo verildiyse)', () => {
    const tartilar: SuruTarti[] = [
      mkTarti({ id: 't1', tarih: '2026-01-10', blok_no: 1, ortalama_kg: 0.2 }),
      mkTarti({ id: 't2', tarih: '2026-01-10', blok_no: 2, ortalama_kg: 0.21 }),
      mkTarti({ id: 't3', tarih: '2026-01-10', blok_no: null, ortalama_kg: 0.22 }),
    ]
    const metrikler = [mkMetrik(10, '2026-01-10', 200)]

    const sonuc = karsilastirTartilar(tartilar, metrikler, 1)
    // Blok 1 + genel (null) dahil, blok 2 dışarıda
    expect(sonuc.map((s) => s.tartiId).sort()).toEqual(['t1', 't3'])
  })

  it('tarih desc sırada döner; aynı tarihte blok asc', () => {
    const tartilar: SuruTarti[] = [
      mkTarti({ id: 't1', tarih: '2026-01-10', blok_no: 2, ortalama_kg: 0.2 }),
      mkTarti({ id: 't2', tarih: '2026-01-15', blok_no: 1, ortalama_kg: 0.3 }),
      mkTarti({ id: 't3', tarih: '2026-01-10', blok_no: 1, ortalama_kg: 0.21 }),
    ]
    const metrikler = [
      mkMetrik(10, '2026-01-10', 200),
      mkMetrik(15, '2026-01-15', 350),
    ]

    const sonuc = karsilastirTartilar(tartilar, metrikler)
    // 2026-01-15 önce; 2026-01-10 sonra (blok 1, 2)
    expect(sonuc.map((s) => s.tartiId)).toEqual(['t2', 't3', 't1'])
  })
})
