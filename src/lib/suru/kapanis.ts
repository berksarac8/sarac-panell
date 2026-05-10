import type { SuruBlok, SuruDonemDurum } from '@/types/suru'

/**
 * Bloklara bakarak dönem durumunu hesaplar.
 * - Tam 3 blok varsa ve hepsinin cikis_tarihi doluysa → 'kapali'
 * - Aksi halde → 'aktif'
 *
 * Saf fonksiyon, server action ve trigger ile aynı sonucu üretir.
 */
export function hesaplaDonemDurumu(bloklar: SuruBlok[]): SuruDonemDurum {
  if (bloklar.length !== 3) return 'aktif'
  const hepsiKapali = bloklar.every((b) => b.cikis_tarihi !== null && b.cikis_tarihi !== '')
  return hepsiKapali ? 'kapali' : 'aktif'
}
