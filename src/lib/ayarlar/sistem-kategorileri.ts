// Migration 0006'da seed'lenen "sistem" kategorileri — UI silinemez olarak göstersin.
// Server actions ve UI bu listeyi kullanır.

export const ODEME_SISTEM_KATEGORILERI = ['Çek', 'Fatura', 'Taksit'] as const
export const OLAY_SISTEM_KATEGORILERI = [
  'Veteriner',
  'Elektrik-tamir',
  'Yem teslimat',
  'İlaç verme',
  'Tartı',
  'Ölü tahliye',
  'Bakım',
  'Diğer ziyaretçi',
  'Diğer',
] as const

export function isOdemeSistemKategori(isim: string): boolean {
  return (ODEME_SISTEM_KATEGORILERI as readonly string[]).includes(isim)
}

export function isOlaySistemKategori(isim: string): boolean {
  return (OLAY_SISTEM_KATEGORILERI as readonly string[]).includes(isim)
}
