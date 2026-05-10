import type { OdemeTekrarPeriyot } from '@/types/odemeler'

/**
 * İlk vade tarihi + periyot + tekrar sayısı verildiğinde,
 * tekrar_sayisi adet ISO tarih ('YYYY-MM-DD') döner.
 *
 * Aylık periyotta ay sonu kaymaları (örn. 31 Ocak → 28 Şubat) ay sonuna sıkıştırılır.
 */
export function uretTekrarVadeleri(
  ilkVade: string,
  periyot: OdemeTekrarPeriyot,
  tekrarSayisi: number
): string[] {
  if (tekrarSayisi < 1) return []
  const [y, m, d] = ilkVade.split('-').map(Number)
  const out: string[] = []
  for (let i = 0; i < tekrarSayisi; i++) {
    if (periyot === 'haftalik') {
      const dt = new Date(y, m - 1, d)
      dt.setDate(dt.getDate() + i * 7)
      out.push(formatIso(dt))
    } else if (periyot === 'aylik') {
      const targetMonth = m - 1 + i
      const targetYear = y + Math.floor(targetMonth / 12)
      const monthNorm = ((targetMonth % 12) + 12) % 12
      const lastDay = new Date(targetYear, monthNorm + 1, 0).getDate()
      const day = Math.min(d, lastDay)
      out.push(formatIso(new Date(targetYear, monthNorm, day)))
    } else if (periyot === 'yillik') {
      out.push(formatIso(new Date(y + i, m - 1, d)))
    }
  }
  return out
}

function formatIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
