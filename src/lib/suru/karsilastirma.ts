import type { SuruTarti } from '@/types/suru'
import type { BlokGunlukMetrik } from '@/types/suru-metrik'

/**
 * Bir tartı kaydı için "gerçek vs tahmini" karşılaştırma sonucu.
 */
export type TartiKarsilastirma = {
  tartiId: string
  tarih: string
  blokNo: number | null
  gercekKg: number // ortalama kg (DB'deki ortalama_kg)
  tahminiKg: number | null // banvit tahmini × kalan → kg dönüştürmesi
  /** gerçek - tahmini (kg). Tahmini yoksa null. */
  farkKg: number | null
  /** (gerçek - tahmini) / tahmini × 100. Tahmini 0 veya yoksa null. */
  farkYuzde: number | null
}

/**
 * Saf fonksiyon: tartılar ile blok metriklerini eşleştirip karşılaştırma listesi üretir.
 *
 * Eşleştirme:
 *   - tartı.tarih === metrik.tarih (string eşitlik; YYYY-MM-DD bazlı)
 *   - tartı.blok_no eşleşmeli (metrikler tek blok için verildiği için tartı.blok_no
 *     ya null (genel) ya da o bloka eşit olmalı)
 *
 * Tahmini gram → kg: tahmini_ortalama_gr / 1000
 * Eğer eşleşme veya tahmini değer yoksa farklar null olur.
 *
 * Sıralama: tarih desc, blok asc.
 */
export function karsilastirTartilar(
  tartilar: SuruTarti[],
  blokGunlukMetrikler: BlokGunlukMetrik[],
  /** Hangi bloğun metrikleri verildi (filtreleme için). undefined → tüm bloklar */
  blokNo?: 1 | 2 | 3
): TartiKarsilastirma[] {
  // metrik tarih → tahmini_ortalama_gr
  const metrikMap = new Map<string, number | null>()
  for (const m of blokGunlukMetrikler) {
    if (m.tarih) metrikMap.set(m.tarih, m.tahmini_ortalama_gr)
  }

  // Tartıları filtrele (blok eşleşmesi)
  const filtreli = tartilar.filter((t) => {
    if (blokNo === undefined) return true
    return t.blok_no === blokNo || t.blok_no === null
  })

  const sonuc: TartiKarsilastirma[] = filtreli.map((t) => {
    const tahminiGr = metrikMap.get(t.tarih) ?? null
    const tahminiKg = tahminiGr !== null ? tahminiGr / 1000 : null

    const farkKg =
      tahminiKg !== null ? Number(t.ortalama_kg) - tahminiKg : null
    const farkYuzde =
      tahminiKg !== null && tahminiKg > 0
        ? ((Number(t.ortalama_kg) - tahminiKg) / tahminiKg) * 100
        : null

    return {
      tartiId: t.id,
      tarih: t.tarih,
      blokNo: t.blok_no,
      gercekKg: Number(t.ortalama_kg),
      tahminiKg,
      farkKg,
      farkYuzde,
    }
  })

  // Sırala: tarih desc, blok asc
  sonuc.sort((a, b) => {
    if (a.tarih !== b.tarih) return a.tarih < b.tarih ? 1 : -1
    return (a.blokNo ?? 0) - (b.blokNo ?? 0)
  })

  return sonuc
}
