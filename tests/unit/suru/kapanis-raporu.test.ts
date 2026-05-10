import { describe, it, expect } from 'vitest'
import { hesaplaKapanisRaporu } from '@/lib/suru/kapanis-raporu'
import type { SuruDonem, SuruBlok, SuruOlum } from '@/types/suru'
import type { BanvitReferans, SuruSuKaydi } from '@/types/suru-metrik'

function mkDonem(durum: 'aktif' | 'kapali' = 'kapali'): SuruDonem {
  return {
    id: 'd1',
    donem_no: '2026-1',
    giris_tarihi: '2026-01-01',
    durum,
    notlar: null,
    olusturan: 'u1',
    created_at: '2026-01-01T00:00:00Z',
  }
}

function mkBlok(
  blok_no: 1 | 2 | 3,
  opts: Partial<SuruBlok> = {}
): SuruBlok {
  return {
    id: `b${blok_no}`,
    donem_id: 'd1',
    blok_no,
    giris_adedi: 1000,
    cikis_tarihi: '2026-02-13',
    cikis_adedi: 950,
    cikis_kg: 2375, // 2.5 kg ortalama
    ...opts,
  }
}

const BANVIT: BanvitReferans[] = [
  { gun_no: 1, beklenen_su_ml: 28, beklenen_yem_gr: 13, beklenen_cumulative_gr: 57 },
  { gun_no: 2, beklenen_su_ml: 32, beklenen_yem_gr: 17, beklenen_cumulative_gr: 73 },
  { gun_no: 3, beklenen_su_ml: 40, beklenen_yem_gr: 20, beklenen_cumulative_gr: 91 },
]

describe('hesaplaKapanisRaporu', () => {
  it('3 blok kapanmış sürü için temel toplamları doğru üretir', () => {
    const donem = mkDonem('kapali')
    const bloklar: SuruBlok[] = [
      mkBlok(1, { giris_adedi: 1000, cikis_adedi: 950, cikis_kg: 2375 }),
      mkBlok(2, { giris_adedi: 1200, cikis_adedi: 1140, cikis_kg: 2850 }),
      mkBlok(3, { giris_adedi: 800, cikis_adedi: 760, cikis_kg: 1900 }),
    ]
    const rapor = hesaplaKapanisRaporu({
      donem,
      bloklar,
      sular: [],
      olumler: [],
      banvitRefs: BANVIT,
    })

    expect(rapor.donemNo).toBe('2026-1')
    expect(rapor.toplamGiris).toBe(3000)
    expect(rapor.toplamCikisAdet).toBe(2850)
    expect(rapor.toplamCikisKg).toBe(7125)
    expect(rapor.kayipAdet).toBe(150)
    expect(rapor.kayipYuzde).toBeCloseTo(5, 4)
    expect(rapor.ortalamaKg).toBeCloseTo(2.5, 4)
    expect(rapor.durum).toBe('kapali')
    expect(rapor.bloklar).toHaveLength(3)
  })

  it('blok bazlı kayıp ve ortalama doğru hesaplanır', () => {
    const donem = mkDonem('kapali')
    const bloklar: SuruBlok[] = [
      mkBlok(1, { giris_adedi: 1000, cikis_adedi: 900, cikis_kg: 2700 }),
    ]
    const rapor = hesaplaKapanisRaporu({
      donem,
      bloklar,
      sular: [],
      olumler: [],
      banvitRefs: BANVIT,
    })

    const b1 = rapor.bloklar[0]
    expect(b1.kayipAdet).toBe(100)
    expect(b1.kayipYuzde).toBeCloseTo(10, 4)
    expect(b1.ortalamaKg).toBeCloseTo(3.0, 4)
    expect(b1.tahminiCanliAgirlikKg).toBeCloseTo(2700, 4)
  })

  it('blok ölümleri sayılır, genel ölüm sadece dönem toplamında', () => {
    const donem = mkDonem('kapali')
    const bloklar: SuruBlok[] = [
      mkBlok(1, { giris_adedi: 1000, cikis_adedi: 950, cikis_kg: 2375 }),
      mkBlok(2, { giris_adedi: 1000, cikis_adedi: 950, cikis_kg: 2375 }),
      mkBlok(3, { giris_adedi: 1000, cikis_adedi: 950, cikis_kg: 2375 }),
    ]
    const olumler: SuruOlum[] = [
      { id: 'o1', donem_id: 'd1', blok_no: 1, tarih: '2026-01-05', adet: 20, sebep: null },
      { id: 'o2', donem_id: 'd1', blok_no: 1, tarih: '2026-01-06', adet: 10, sebep: null },
      { id: 'o3', donem_id: 'd1', blok_no: 2, tarih: '2026-01-07', adet: 5, sebep: null },
      { id: 'o4', donem_id: 'd1', blok_no: null, tarih: '2026-01-08', adet: 7, sebep: null },
    ]
    const rapor = hesaplaKapanisRaporu({
      donem,
      bloklar,
      sular: [],
      olumler,
      banvitRefs: BANVIT,
    })

    expect(rapor.bloklar[0].toplamOlum).toBe(30)
    expect(rapor.bloklar[1].toplamOlum).toBe(5)
    expect(rapor.bloklar[2].toplamOlum).toBe(0)
    expect(rapor.toplamOlum).toBe(42)
  })

  it('su totali ve tahmini yem banvit oranıyla hesaplanır', () => {
    const donem = mkDonem('kapali')
    const bloklar: SuruBlok[] = [
      mkBlok(1, { giris_adedi: 1000, cikis_adedi: 950, cikis_kg: 2375 }),
    ]
    const sular: SuruSuKaydi[] = [
      { id: 's1', donem_id: 'd1', blok_no: 1, tarih: '2026-01-01', gun_no: 1, su_litre: 100 },
      { id: 's2', donem_id: 'd1', blok_no: 1, tarih: '2026-01-02', gun_no: 2, su_litre: 200 },
    ]
    const rapor = hesaplaKapanisRaporu({
      donem,
      bloklar,
      sular,
      olumler: [],
      banvitRefs: BANVIT,
    })

    expect(rapor.bloklar[0].toplamSuLitre).toBe(300)
    // gün1: 100 × 13/28 = 46.4286
    // gün2: 200 × 17/32 = 106.25
    // toplam yem ≈ 152.6786
    expect(rapor.bloklar[0].tahminiToplamYemKg).toBeCloseTo(152.6786, 3)
    expect(rapor.toplamSuLitre).toBe(300)
    expect(rapor.toplamCikisKg).toBe(2375)
    // FCR = 152.6786 / 2375 ≈ 0.06428
    expect(rapor.bloklar[0].fcr).toBeCloseTo(0.06428, 4)
  })

  it('çıkış tarihi yoksa (aktif) cikisTarihi ve gunSayisi null', () => {
    const donem = mkDonem('aktif')
    const bloklar: SuruBlok[] = [
      mkBlok(1, { cikis_tarihi: null, cikis_adedi: null, cikis_kg: null }),
      mkBlok(2, { cikis_tarihi: null, cikis_adedi: null, cikis_kg: null }),
      mkBlok(3, { cikis_tarihi: null, cikis_adedi: null, cikis_kg: null }),
    ]
    const rapor = hesaplaKapanisRaporu({
      donem,
      bloklar,
      sular: [],
      olumler: [],
      banvitRefs: BANVIT,
    })

    expect(rapor.durum).toBe('aktif')
    expect(rapor.cikisTarihi).toBeNull()
    expect(rapor.gunSayisi).toBeNull()
    expect(rapor.ortalamaKg).toBeNull()
    expect(rapor.bloklar[0].fcr).toBeNull()
    expect(rapor.bloklar[0].ortalamaKg).toBeNull()
    expect(rapor.bloklar[0].kayipAdet).toBeNull()
  })

  it('çıkış tarihi farklı bloklar için en son tarih dönem cikisTarihi olur', () => {
    const donem = mkDonem('kapali')
    const bloklar: SuruBlok[] = [
      mkBlok(1, { cikis_tarihi: '2026-02-13' }),
      mkBlok(2, { cikis_tarihi: '2026-02-15' }),
      mkBlok(3, { cikis_tarihi: '2026-02-14' }),
    ]
    const rapor = hesaplaKapanisRaporu({
      donem,
      bloklar,
      sular: [],
      olumler: [],
      banvitRefs: BANVIT,
    })

    expect(rapor.cikisTarihi).toBe('2026-02-15')
    // giriş 2026-01-01, çıkış 2026-02-15 → 46. gün
    expect(rapor.gunSayisi).toBe(46)
  })

  it('bloklar blok_no sırasında dönen raporda yer alır', () => {
    const donem = mkDonem('kapali')
    const bloklar: SuruBlok[] = [
      mkBlok(3, { id: 'b3' }),
      mkBlok(1, { id: 'b1' }),
      mkBlok(2, { id: 'b2' }),
    ]
    const rapor = hesaplaKapanisRaporu({
      donem,
      bloklar,
      sular: [],
      olumler: [],
      banvitRefs: BANVIT,
    })
    expect(rapor.bloklar.map((b) => b.blokNo)).toEqual([1, 2, 3])
  })
})
