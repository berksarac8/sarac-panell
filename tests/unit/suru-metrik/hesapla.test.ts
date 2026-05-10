import { describe, it, expect } from 'vitest'
import { hesaplaBlokGunluk } from '@/lib/suru-metrik/hesapla'
import type { BanvitReferans } from '@/types/suru-metrik'

const BANVIT_TAM: BanvitReferans[] = [
  { gun_no: 1, beklenen_su_ml: 28, beklenen_yem_gr: 13, beklenen_cumulative_gr: 57 },
  { gun_no: 2, beklenen_su_ml: 32, beklenen_yem_gr: 17, beklenen_cumulative_gr: 73 },
  { gun_no: 3, beklenen_su_ml: 40, beklenen_yem_gr: 20, beklenen_cumulative_gr: 91 },
  { gun_no: 4, beklenen_su_ml: 48, beklenen_yem_gr: 23, beklenen_cumulative_gr: 111 },
  { gun_no: 5, beklenen_su_ml: 52, beklenen_yem_gr: 27, beklenen_cumulative_gr: 134 },
]

describe('hesaplaBlokGunluk — Excel sayfa 1 ilk 5 gün', () => {
  const sonuc = hesaplaBlokGunluk({
    giris_adedi: 37044,
    olumler: [
      { gun_no: 1, adet: 123 },
      { gun_no: 2, adet: 131 },
      { gun_no: 3, adet: 164 },
      { gun_no: 4, adet: 113 },
      { gun_no: 5, adet: 96 },
    ],
    suler: [
      { gun_no: 1, su_litre: 1080 },
      { gun_no: 2, su_litre: 1235 },
      { gun_no: 3, su_litre: 1560 },
      { gun_no: 4, su_litre: 1850 },
      { gun_no: 5, su_litre: 1950 },
    ],
    banvitReferans: BANVIT_TAM,
  })

  it('5 satır döner', () => {
    expect(sonuc).toHaveLength(5)
  })

  it('Gün 1 — kalan hayvan, su/hayvan, beklenen su, fark%', () => {
    const g = sonuc[0]
    expect(g.gun_no).toBe(1)
    expect(g.gunluk_olum).toBe(123)
    expect(g.gunluk_su_litre).toBe(1080)
    expect(g.kalan_hayvan).toBe(36921)
    // 1080000 / 36921 ≈ 29.2516
    expect(g.hayvan_basina_su_ml).toBeCloseTo(29.2516, 3)
    expect(g.banvit_su_ml).toBe(28)
    // 36921 × 28 / 1000 = 1033.788
    expect(g.beklenen_su_litre).toBeCloseTo(1033.788, 2)
    // (29.2516 - 28) / 28 ≈ 0.04470
    expect(g.su_gerceklesme_yuzde).toBeCloseTo(0.04470, 4)
    expect(g.su_yesil).toBe(true) // hayvan başına > banvit
  })

  it('Gün 1 — yem oranı, beklenen yem, hayvan başına yem', () => {
    const g = sonuc[0]
    // 13/28 ≈ 0.46428
    expect(g.banvit_yem_su_orani).toBeCloseTo(0.46428, 4)
    // 1080 × 13/28 = 501.4286
    expect(g.beklenen_yem_kg).toBeCloseTo(501.4286, 3)
    // 501.42857 × 1000 / 36921 ≈ 13.58112
    expect(g.hayvan_basina_yem_gr).toBeCloseTo(13.58112, 4)
  })

  it('Gün 1 — cumulative ve büyüme tahmini', () => {
    const g = sonuc[0]
    expect(g.bizim_cumulative_yem_gr).toBeCloseTo(13.58112, 4)
    expect(g.banvit_cumulative_yem_gr).toBe(13)
    expect(g.banvit_cumulative_gr).toBe(57)
    // (57 × 13.58112) / 13 ≈ 59.54799
    expect(g.tahmini_ortalama_gr).toBeCloseTo(59.54799, 4)
    // Gün 1: dün yok → 0 kabul edilir
    expect(g.gunluk_buyume_tahmini_gr).toBeCloseTo(59.54799, 4)
    expect(g.banvit_gunluk_buyume_gr).toBe(57)
    // (59.54799 - 57) / 57 ≈ 0.04470
    expect(g.buyume_fark_yuzde).toBeCloseTo(0.04470, 4)
    expect(g.buyume_yesil).toBe(true)
  })

  it('Gün 2 — kümülatif ölüm 254, kalan 36790', () => {
    const g = sonuc[1]
    expect(g.gun_no).toBe(2)
    expect(g.kalan_hayvan).toBe(36790)
    // 1235000 / 36790 ≈ 33.5689
    expect(g.hayvan_basina_su_ml).toBeCloseTo(33.5689, 3)
    expect(g.banvit_su_ml).toBe(32)
    // 36790 × 32 / 1000 = 1177.28
    expect(g.beklenen_su_litre).toBeCloseTo(1177.28, 2)
    // (33.5689 - 32) / 32 ≈ 0.04903
    expect(g.su_gerceklesme_yuzde).toBeCloseTo(0.04903, 4)
    expect(g.su_yesil).toBe(true)
  })

  it('Gün 2 — yem ve cumulative', () => {
    const g = sonuc[1]
    // 17/32 = 0.53125
    expect(g.banvit_yem_su_orani).toBeCloseTo(0.53125, 4)
    // 1235 × 17/32 = 656.09375
    expect(g.beklenen_yem_kg).toBeCloseTo(656.0937, 3)
    // 656.09375 × 1000 / 36790 ≈ 17.83349
    expect(g.hayvan_basina_yem_gr).toBeCloseTo(17.83349, 4)
    // 13.58112 + 17.83349 ≈ 31.41461
    expect(g.bizim_cumulative_yem_gr).toBeCloseTo(31.41461, 4)
    expect(g.banvit_cumulative_yem_gr).toBe(30) // 13+17
    expect(g.banvit_cumulative_gr).toBe(73)
    // (73 × 31.41461) / 30 ≈ 76.44222
    expect(g.tahmini_ortalama_gr).toBeCloseTo(76.44222, 3)
    // 76.44222 - 59.54799 ≈ 16.89421
    expect(g.gunluk_buyume_tahmini_gr).toBeCloseTo(16.89421, 4)
    // 73 - 57 = 16
    expect(g.banvit_gunluk_buyume_gr).toBe(16)
    // (16.89421 - 16) / 16 ≈ 0.05589
    expect(g.buyume_fark_yuzde).toBeCloseTo(0.05589, 4)
  })

  it('Gün 3 — kümülatif ölüm 418, kalan 36626', () => {
    const g = sonuc[2]
    expect(g.kalan_hayvan).toBe(36626)
    // 1560000 / 36626 ≈ 42.5928
    expect(g.hayvan_basina_su_ml).toBeCloseTo(42.5928, 3)
    expect(g.banvit_su_ml).toBe(40)
  })

  it('Gün 4 — kümülatif ölüm 531, kalan 36513', () => {
    const g = sonuc[3]
    expect(g.kalan_hayvan).toBe(36513)
    // 1850000 / 36513 ≈ 50.6669
    expect(g.hayvan_basina_su_ml).toBeCloseTo(50.6669, 3)
  })

  it('Gün 5 — kümülatif ölüm 627, kalan 36417', () => {
    const g = sonuc[4]
    expect(g.kalan_hayvan).toBe(36417)
    // 1950000 / 36417 ≈ 53.5466
    expect(g.hayvan_basina_su_ml).toBeCloseTo(53.5466, 3)
    expect(g.banvit_su_ml).toBe(52)
    expect(g.su_yesil).toBe(true) // 53.55 > 52
  })
})

describe('hesaplaBlokGunluk — edge case: giriş=0', () => {
  it('giriş_adedi=0 ise kalan=0, hayvan_başına alanları null', () => {
    const sonuc = hesaplaBlokGunluk({
      giris_adedi: 0,
      olumler: [],
      suler: [{ gun_no: 1, su_litre: 100 }],
      banvitReferans: BANVIT_TAM,
    })
    expect(sonuc).toHaveLength(1)
    const g = sonuc[0]
    expect(g.kalan_hayvan).toBe(0)
    expect(g.hayvan_basina_su_ml).toBeNull()
    expect(g.hayvan_basina_yem_gr).toBeNull()
    // beklenen_su_litre hâlâ hesaplanır (kalan × banvit / 1000)
    expect(g.beklenen_su_litre).toBe(0)
  })
})

describe('hesaplaBlokGunluk — edge case: gün > 44', () => {
  it('gün 45 satırı: banvit referansı yoksa banvit alanları null', () => {
    const sonuc = hesaplaBlokGunluk({
      giris_adedi: 1000,
      olumler: [{ gun_no: 45, adet: 5 }],
      suler: [{ gun_no: 45, su_litre: 100 }],
      banvitReferans: BANVIT_TAM, // sadece 1-5
    })
    expect(sonuc).toHaveLength(1)
    const g = sonuc[0]
    expect(g.gun_no).toBe(45)
    expect(g.banvit_su_ml).toBeNull()
    expect(g.beklenen_su_litre).toBeNull()
    expect(g.su_gerceklesme_yuzde).toBeNull()
    expect(g.banvit_yem_gr).toBeNull()
    expect(g.banvit_yem_su_orani).toBeNull()
    expect(g.beklenen_yem_kg).toBeNull()
    expect(g.hayvan_basina_yem_gr).toBeNull()
    expect(g.bizim_cumulative_yem_gr).toBeNull()
    expect(g.banvit_cumulative_yem_gr).toBeNull()
    expect(g.banvit_cumulative_gr).toBeNull()
    expect(g.tahmini_ortalama_gr).toBeNull()
    expect(g.gunluk_buyume_tahmini_gr).toBeNull()
    expect(g.banvit_gunluk_buyume_gr).toBeNull()
    expect(g.buyume_fark_yuzde).toBeNull()
    expect(g.su_yesil).toBe(false) // banvit yoksa yeşil değil
    expect(g.buyume_yesil).toBeNull()
    // hayvan_basina_su_ml hâlâ hesaplanır (banvit gerektirmez)
    expect(g.hayvan_basina_su_ml).not.toBeNull()
    expect(g.kalan_hayvan).toBe(995)
  })
})

describe('hesaplaBlokGunluk — edge case: ölüm > kalan', () => {
  it('ölüm kalan hayvanı negatife götürürse kalan 0\'a clamp\'lenir', () => {
    const sonuc = hesaplaBlokGunluk({
      giris_adedi: 100,
      olumler: [
        { gun_no: 1, adet: 60 },
        { gun_no: 2, adet: 50 }, // toplam 110 > 100
      ],
      suler: [
        { gun_no: 1, su_litre: 5 },
        { gun_no: 2, su_litre: 5 },
      ],
      banvitReferans: BANVIT_TAM,
    })
    expect(sonuc).toHaveLength(2)
    expect(sonuc[0].kalan_hayvan).toBe(40) // 100 - 60
    expect(sonuc[1].kalan_hayvan).toBe(0) // clamp
    expect(sonuc[1].hayvan_basina_su_ml).toBeNull()
  })
})

describe('hesaplaBlokGunluk — boş input', () => {
  it('ölüm ve su yoksa boş dizi döner', () => {
    const sonuc = hesaplaBlokGunluk({
      giris_adedi: 1000,
      olumler: [],
      suler: [],
      banvitReferans: BANVIT_TAM,
    })
    expect(sonuc).toEqual([])
  })

  it('sadece su girilen günler satır oluşturur', () => {
    const sonuc = hesaplaBlokGunluk({
      giris_adedi: 1000,
      olumler: [],
      suler: [
        { gun_no: 1, su_litre: 30 },
        { gun_no: 3, su_litre: 50 },
      ],
      banvitReferans: BANVIT_TAM,
    })
    // Gün 2 atlandığı için 2 satır döner
    expect(sonuc).toHaveLength(2)
    expect(sonuc.map((s) => s.gun_no)).toEqual([1, 3])
  })

  it('sadece ölüm girilen günler de satır oluşturur', () => {
    const sonuc = hesaplaBlokGunluk({
      giris_adedi: 1000,
      olumler: [{ gun_no: 1, adet: 10 }],
      suler: [],
      banvitReferans: BANVIT_TAM,
    })
    expect(sonuc).toHaveLength(1)
    expect(sonuc[0].gunluk_olum).toBe(10)
    expect(sonuc[0].gunluk_su_litre).toBe(0)
  })
})

describe('hesaplaBlokGunluk — su_yesil ve buyume_yesil bayrakları', () => {
  it('hayvan_başına_su < banvit ise su_yesil=false', () => {
    const sonuc = hesaplaBlokGunluk({
      giris_adedi: 100000, // çok fazla hayvan → hayvan başına çok az su
      olumler: [],
      suler: [{ gun_no: 1, su_litre: 100 }], // 100L / 100k = 1 ml/hayvan
      banvitReferans: BANVIT_TAM,
    })
    expect(sonuc[0].hayvan_basina_su_ml).toBeCloseTo(1, 4)
    expect(sonuc[0].banvit_su_ml).toBe(28)
    expect(sonuc[0].su_yesil).toBe(false)
  })
})
