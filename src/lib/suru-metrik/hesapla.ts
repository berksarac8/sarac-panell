import type { BanvitReferans, BlokGunlukMetrik } from '@/types/suru-metrik'

/**
 * Bir blok için günlük metrikleri Excel formüllerine göre hesaplar.
 *
 * Saf fonksiyon — DB'den okunan ham veriyi alır, sıralı `BlokGunlukMetrik[]`
 * üretir. Sadece ölüm veya su girilmiş günler için satır döner.
 *
 * Notlar:
 * - Banvit referansı 44 gün için tanımlı; aşan günlerde banvite bağlı alanlar null.
 * - kalan_hayvan = giris - kümülatif_ölüm; 0'a clamp.
 * - hayvan_basina_su / hayvan_basina_yem: kalan=0 ise null (sıfıra bölme).
 * - tahmini_ortalama: banvit_cumulative_yem=0 ise null (sıfıra bölme).
 * - günlük_büyüme: önceki gün yoksa "dün=0" kabul edilir (Excel davranışı).
 */
export function hesaplaBlokGunluk(input: {
  giris_adedi: number
  olumler: { gun_no: number; adet: number }[]
  suler: { gun_no: number; su_litre: number }[]
  banvitReferans: BanvitReferans[]
  tarihler?: { gun_no: number; tarih: string }[]
}): BlokGunlukMetrik[] {
  const { giris_adedi, olumler, suler, banvitReferans, tarihler } = input

  // Banvit referansı gun_no -> ref map
  const banvitMap = new Map<number, BanvitReferans>()
  for (const r of banvitReferans) {
    banvitMap.set(r.gun_no, r)
  }

  // Ölüm ve su map'leri (aynı gün, blok için DB unique olur ama agregelenir)
  const olumMap = new Map<number, number>()
  for (const o of olumler) {
    olumMap.set(o.gun_no, (olumMap.get(o.gun_no) ?? 0) + o.adet)
  }
  const suMap = new Map<number, number>()
  for (const s of suler) {
    suMap.set(s.gun_no, (suMap.get(s.gun_no) ?? 0) + s.su_litre)
  }
  const tarihMap = new Map<number, string>()
  for (const t of tarihler ?? []) {
    tarihMap.set(t.gun_no, t.tarih)
  }

  // Tüm aktif günleri topla, sırala
  const tumGunler = new Set<number>()
  for (const g of olumMap.keys()) tumGunler.add(g)
  for (const g of suMap.keys()) tumGunler.add(g)
  const siraliGunler = [...tumGunler].sort((a, b) => a - b)

  if (siraliGunler.length === 0) return []

  const sonuclar: BlokGunlukMetrik[] = []
  let kumOlum = 0
  let bizimCumYem = 0 // hayvan_basina_yem toplamı (gr)
  let banvitCumYem = 0 // banvit yem toplamı (gr)
  let oncekiTahminiGr: number | null = null
  let oncekiBanvitCumGr: number | null = null

  for (const gun of siraliGunler) {
    const olum = olumMap.get(gun) ?? 0
    const suLitre = suMap.get(gun) ?? 0
    kumOlum += olum

    const kalanHam = giris_adedi - kumOlum
    const kalan = kalanHam < 0 ? 0 : kalanHam

    const banvit = banvitMap.get(gun) ?? null

    const hayvanBasinaSuMl =
      kalan > 0 ? (suLitre * 1000) / kalan : null

    let banvitSuMl: number | null = null
    let beklenenSuLitre: number | null = null
    let suGerceklesmeYuzde: number | null = null
    let banvitYemGr: number | null = null
    let banvitYemSuOrani: number | null = null
    let beklenenYemKg: number | null = null
    let hayvanBasinaYemGr: number | null = null
    let bizimCumYemSnapshot: number | null = null
    let banvitCumYemSnapshot: number | null = null
    let banvitCumGr: number | null = null
    let tahminiOrtalamaGr: number | null = null
    let gunlukBuyumeTahminiGr: number | null = null
    let banvitGunlukBuyumeGr: number | null = null
    let buyumeFarkYuzde: number | null = null
    let suYesil = false
    let buyumeYesil: boolean | null = null

    if (banvit) {
      banvitSuMl = banvit.beklenen_su_ml
      beklenenSuLitre = (kalan * banvit.beklenen_su_ml) / 1000
      banvitYemGr = banvit.beklenen_yem_gr
      banvitYemSuOrani =
        banvit.beklenen_su_ml > 0
          ? banvit.beklenen_yem_gr / banvit.beklenen_su_ml
          : null
      beklenenYemKg = banvitYemSuOrani !== null ? suLitre * banvitYemSuOrani : null
      hayvanBasinaYemGr =
        beklenenYemKg !== null && kalan > 0
          ? (beklenenYemKg * 1000) / kalan
          : null

      // Cumulative'lara ekle (gün > 44 ise referans olmadığı için cumulative donar)
      bizimCumYem += hayvanBasinaYemGr ?? 0
      banvitCumYem += banvit.beklenen_yem_gr
      bizimCumYemSnapshot = bizimCumYem
      banvitCumYemSnapshot = banvitCumYem
      banvitCumGr = banvit.beklenen_cumulative_gr

      // Su gerçekleşme % (hayvan başına su NULL ise hesaplanamaz)
      if (hayvanBasinaSuMl !== null && banvit.beklenen_su_ml > 0) {
        suGerceklesmeYuzde =
          (hayvanBasinaSuMl - banvit.beklenen_su_ml) / banvit.beklenen_su_ml
        suYesil = hayvanBasinaSuMl > banvit.beklenen_su_ml
      }

      // Tahmini ortalama gram
      if (banvitCumYem > 0) {
        tahminiOrtalamaGr =
          (banvit.beklenen_cumulative_gr * bizimCumYem) / banvitCumYem
      }

      // Günlük büyüme (önceki gün null ise 0 kabul et)
      const oncekiTahmin = oncekiTahminiGr ?? 0
      const oncekiBanvitCum = oncekiBanvitCumGr ?? 0
      if (tahminiOrtalamaGr !== null) {
        gunlukBuyumeTahminiGr = tahminiOrtalamaGr - oncekiTahmin
      }
      banvitGunlukBuyumeGr = banvit.beklenen_cumulative_gr - oncekiBanvitCum

      if (
        gunlukBuyumeTahminiGr !== null &&
        banvitGunlukBuyumeGr !== null &&
        banvitGunlukBuyumeGr !== 0
      ) {
        buyumeFarkYuzde =
          (gunlukBuyumeTahminiGr - banvitGunlukBuyumeGr) / banvitGunlukBuyumeGr
        buyumeYesil = buyumeFarkYuzde > 0
      }

      // Sonraki iterasyon için snapshot'ları güncelle
      oncekiTahminiGr = tahminiOrtalamaGr
      oncekiBanvitCumGr = banvit.beklenen_cumulative_gr
    }
    // Banvit yoksa cumulative'lar olduğu yerde kalır, "dün" güncellenmez

    sonuclar.push({
      gun_no: gun,
      tarih: tarihMap.get(gun) ?? null,
      gunluk_olum: olum,
      gunluk_su_litre: suLitre,
      kalan_hayvan: kalan,
      hayvan_basina_su_ml: hayvanBasinaSuMl,
      banvit_su_ml: banvitSuMl,
      beklenen_su_litre: beklenenSuLitre,
      su_gerceklesme_yuzde: suGerceklesmeYuzde,
      banvit_yem_gr: banvitYemGr,
      banvit_yem_su_orani: banvitYemSuOrani,
      beklenen_yem_kg: beklenenYemKg,
      hayvan_basina_yem_gr: hayvanBasinaYemGr,
      bizim_cumulative_yem_gr: bizimCumYemSnapshot,
      banvit_cumulative_yem_gr: banvitCumYemSnapshot,
      banvit_cumulative_gr: banvitCumGr,
      tahmini_ortalama_gr: tahminiOrtalamaGr,
      gunluk_buyume_tahmini_gr: gunlukBuyumeTahminiGr,
      banvit_gunluk_buyume_gr: banvitGunlukBuyumeGr,
      buyume_fark_yuzde: buyumeFarkYuzde,
      su_yesil: suYesil,
      buyume_yesil: buyumeYesil,
    })
  }

  return sonuclar
}
