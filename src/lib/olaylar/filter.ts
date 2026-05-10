import type { CiftlikOlay, OlayFiltre } from '@/types/olaylar'

export function filterOlaylar(items: CiftlikOlay[], f: OlayFiltre): CiftlikOlay[] {
  return items.filter((o) => {
    if (f.kategori_ids && f.kategori_ids.length > 0) {
      if (!o.kategori_id || !f.kategori_ids.includes(o.kategori_id)) return false
    }
    if (f.tarih_baslangic && o.tarih < f.tarih_baslangic) return false
    if (f.tarih_bitis && o.tarih > f.tarih_bitis) return false
    if (f.donem_id && o.donem_id !== f.donem_id) return false
    if (f.arama) {
      const t = f.arama.toLocaleLowerCase('tr-TR')
      const hay = [o.baslik, o.aciklama ?? '', o.kisi_firma ?? '']
        .join(' ')
        .toLocaleLowerCase('tr-TR')
      if (!hay.includes(t)) return false
    }
    return true
  })
}
