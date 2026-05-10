export type OdemeKategori = {
  id: string
  isim: string
  renk: string
}

export type OdemeTekrarPeriyot = 'haftalik' | 'aylik' | 'yillik'

export type OdemeTekrarGrubu = {
  id: string
  baslik: string
  periyot: OdemeTekrarPeriyot
  tekrar_sayisi: number
  olusturan: string
  created_at: string
}

export type Odeme = {
  id: string
  aciklama: string
  kategori_id: string | null
  kategori?: OdemeKategori | null
  tutar: number
  vade_tarihi: string // ISO date 'YYYY-MM-DD'
  kime: string | null
  notlar: string | null
  odendi_mi: boolean
  odeme_tarihi: string | null
  tekrar_grubu_id: string | null
  olusturan: string
  created_at: string
  updated_at: string
}

export type OdemeDurum = 'odendi' | 'yaklasan' | 'gecikmis' | 'beklemede'

export type OdemeFiltre = {
  kategori_ids?: string[]
  durumlar?: OdemeDurum[]
  tarih_baslangic?: string | null
  tarih_bitis?: string | null
  arama?: string | null
}

export type OdemeInput = {
  aciklama: string
  kategori_id: string | null
  tutar: number
  vade_tarihi: string
  kime: string | null
  notlar: string | null
  odendi_mi: boolean
  odeme_tarihi: string | null
}

export type TekrarInput = OdemeInput & {
  baslik: string
  periyot: OdemeTekrarPeriyot
  tekrar_sayisi: number
}
