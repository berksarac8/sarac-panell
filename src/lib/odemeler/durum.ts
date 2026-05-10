import type { Odeme, OdemeDurum } from '@/types/odemeler'

/**
 * Bir ödemenin durumunu hesaplar.
 * - Ödeme tarihi varsa → "odendi"
 * - Vade < bugün → "gecikmis"
 * - 0 ≤ vade − bugün ≤ 7 → "yaklasan"
 * - vade − bugün > 7 → "beklemede"
 *
 * Karşılaştırma takvim günü bazında yapılır (saat dakika atılır).
 */
export function hesaplaDurum(odeme: Odeme, bugun: Date = new Date()): OdemeDurum {
  if (odeme.odeme_tarihi || odeme.odendi_mi) {
    if (odeme.odeme_tarihi) return 'odendi'
    // odendi_mi=true ama odeme_tarihi null ise yine "odendi" davranır
    return 'odendi'
  }

  const vade = parseDateOnly(odeme.vade_tarihi)
  const today = stripTime(bugun)
  const diffMs = vade.getTime() - today.getTime()
  const diffGun = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffGun < 0) return 'gecikmis'
  if (diffGun <= 7) return 'yaklasan'
  return 'beklemede'
}

function parseDateOnly(iso: string): Date {
  // 'YYYY-MM-DD' → yerel saatte 00:00
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

export const DURUM_LABEL: Record<OdemeDurum, string> = {
  odendi: 'Ödendi',
  yaklasan: 'Yaklaşan',
  gecikmis: 'Gecikmiş',
  beklemede: 'Beklemede',
}

export const DURUM_RENK: Record<OdemeDurum, 'success' | 'warning' | 'danger' | 'muted'> = {
  odendi: 'success',
  yaklasan: 'warning',
  gecikmis: 'danger',
  beklemede: 'muted',
}
