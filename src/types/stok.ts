export type StokKategori = 'yem' | 'ilac' | 'malzeme' | 'diger'
export type StokBirim = 'kg' | 'litre' | 'adet' | 'paket'
export type HareketTipi = 'giris' | 'cikis'

export const STOK_KATEGORI_LABEL: Record<StokKategori, string> = {
  yem: 'Yem',
  ilac: 'İlaç',
  malzeme: 'Malzeme',
  diger: 'Diğer',
}

export const STOK_BIRIM_LABEL: Record<StokBirim, string> = {
  kg: 'kg',
  litre: 'litre',
  adet: 'adet',
  paket: 'paket',
}

export type StokKalem = {
  id: string
  isim: string
  kategori: StokKategori
  birim: StokBirim
  notlar: string | null
  created_at: string
}

export type StokKalemOzet = StokKalem & {
  toplam_giris: number
  toplam_cikis: number
  mevcut: number
}

export type SuruDonemRef = {
  id: string
  donem_no: string
  durum: 'aktif' | 'kapali'
}

export type StokHareket = {
  id: string
  kalem_id: string
  kalem?: { id: string; isim: string; birim: StokBirim } | null
  hareket_tipi: HareketTipi
  miktar: number
  birim_fiyat: number | null
  tedarikci: string | null
  tarih: string
  donem_id: string | null
  donem?: SuruDonemRef | null
  notlar: string | null
  olusturan: string | null
  created_at: string
}

export type StokKalemInput = {
  isim: string
  kategori: StokKategori
  birim: StokBirim
  notlar: string | null
}

export type StokHareketInput = {
  kalem_id: string
  hareket_tipi: HareketTipi
  miktar: number
  birim_fiyat: number | null
  tedarikci: string | null
  tarih: string
  donem_id: string | null
  notlar: string | null
}

export type StokHareketFiltre = {
  kalem_id?: string | null
  donem_id?: string | null
  hareket_tipi?: HareketTipi | null
  tarih_baslangic?: string | null
  tarih_bitis?: string | null
}
