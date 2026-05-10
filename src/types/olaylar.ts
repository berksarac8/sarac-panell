export type OlayKategori = {
  id: string
  isim: string
  renk: string
}

export type SuruDonemRef = {
  id: string
  donem_no: string
  durum: 'aktif' | 'kapali'
}

export type CiftlikOlay = {
  id: string
  tarih: string // ISO date
  kategori_id: string | null
  kategori?: OlayKategori | null
  baslik: string
  aciklama: string | null
  kisi_firma: string | null
  donem_id: string | null
  donem?: SuruDonemRef | null
  olusturan: string
  created_at: string
  updated_at: string
}

export type OlayFiltre = {
  kategori_ids?: string[]
  tarih_baslangic?: string | null
  tarih_bitis?: string | null
  donem_id?: string | null
  arama?: string | null
}

export type OlayInput = {
  tarih: string
  kategori_id: string | null
  baslik: string
  aciklama: string | null
  kisi_firma: string | null
  donem_id: string | null
}
