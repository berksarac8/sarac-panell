import type { HareketTipi } from '@/types/stok'

export type HareketRow = {
  kalem_id: string
  hareket_tipi: HareketTipi
  miktar: number | string
}

/**
 * Belirli bir stok kaleminin mevcut miktarı = sum(giris) - sum(cikis).
 * Yalnızca o kaleme ait hareketler dikkate alınır.
 */
export function hesaplaMevcut(kalemId: string, hareketler: HareketRow[]): number {
  let giris = 0
  let cikis = 0
  for (const h of hareketler) {
    if (h.kalem_id !== kalemId) continue
    const m = Number(h.miktar)
    if (!Number.isFinite(m)) continue
    if (h.hareket_tipi === 'giris') giris += m
    else cikis += m
  }
  return giris - cikis
}

/**
 * Tüm kalemler için mevcut miktarları map olarak döner.
 */
export function mevcutMap(hareketler: HareketRow[]): Map<string, number> {
  const m = new Map<string, { g: number; c: number }>()
  for (const h of hareketler) {
    const cur = m.get(h.kalem_id) ?? { g: 0, c: 0 }
    const miktar = Number(h.miktar)
    if (!Number.isFinite(miktar)) continue
    if (h.hareket_tipi === 'giris') cur.g += miktar
    else cur.c += miktar
    m.set(h.kalem_id, cur)
  }
  const out = new Map<string, number>()
  for (const [k, v] of m) out.set(k, v.g - v.c)
  return out
}
