// Sürü Excel hesaplama metrikleri için tipler

export type SuruSuKaydi = {
  id: string
  donem_id: string
  blok_no: 1 | 2 | 3
  tarih: string // 'YYYY-MM-DD'
  gun_no: number // 1-44
  su_litre: number
}

export type BanvitReferans = {
  gun_no: number // 1-44
  beklenen_su_ml: number
  beklenen_yem_gr: number
  beklenen_cumulative_gr: number
}

/**
 * Bir blok için bir günün hesaplanmış metrikleri (Excel satırı karşılığı).
 *
 * Manuel girişler:
 *   - gunluk_olum, gunluk_su_litre
 *
 * Hesaplananlar Excel formüllerinden gelir; gün > 44 ise referansa bağlı
 * alanlar `null` olur (UI'da "—" gösterilir).
 */
export type BlokGunlukMetrik = {
  gun_no: number
  tarih: string | null // tarih bilinmiyorsa null
  // Manuel girişler
  gunluk_olum: number
  gunluk_su_litre: number
  // Türetilenler
  kalan_hayvan: number
  hayvan_basina_su_ml: number | null // kalan_hayvan = 0 ise null
  // Banvit + karşılaştırmalar (gün > 44 → null)
  banvit_su_ml: number | null
  beklenen_su_litre: number | null
  su_gerceklesme_yuzde: number | null
  banvit_yem_gr: number | null
  banvit_yem_su_orani: number | null
  beklenen_yem_kg: number | null
  hayvan_basina_yem_gr: number | null
  bizim_cumulative_yem_gr: number | null
  banvit_cumulative_yem_gr: number | null
  banvit_cumulative_gr: number | null
  tahmini_ortalama_gr: number | null
  gunluk_buyume_tahmini_gr: number | null
  banvit_gunluk_buyume_gr: number | null
  buyume_fark_yuzde: number | null
  // Renk bayrakları
  su_yesil: boolean
  /** Büyüme fark % > 0 → true (yeşil), < 0 → false (kırmızı), hesaplanamadı → null */
  buyume_yesil: boolean | null
}

export type SuInput = {
  blok_no: 1 | 2 | 3
  tarih: string
  gun_no: number
  su_litre: number
}
