export type SuruDonemDurum = 'aktif' | 'kapali'
export type YemTipi = 'baslatici' | 'buyutme' | 'bitirici'

export type SuruBlok = {
  id: string
  donem_id: string
  blok_no: 1 | 2 | 3
  giris_adedi: number
  cikis_tarihi: string | null // 'YYYY-MM-DD'
  cikis_adedi: number | null
  cikis_kg: number | null
}

export type SuruDonem = {
  id: string
  donem_no: string // örn '2026-1'
  giris_tarihi: string
  durum: SuruDonemDurum
  notlar: string | null
  olusturan: string
  created_at: string
  bloklar?: SuruBlok[]
}

export type SuruTarti = {
  id: string
  donem_id: string
  blok_no: number | null // null = genel
  tarih: string
  tartilan_adet: number
  ortalama_kg: number
}

export type SuruOlum = {
  id: string
  donem_id: string
  blok_no: number | null
  tarih: string
  adet: number
  sebep: string | null
}

export type SuruYem = {
  id: string
  donem_id: string
  blok_no: number | null
  tarih: string
  yem_kg: number
  yem_tipi: YemTipi
}

export type YeniSuruInput = {
  giris_tarihi: string
  blok1_adedi: number
  blok2_adedi: number
  blok3_adedi: number
  notlar: string | null
}

export type BlokKapatInput = {
  cikis_tarihi: string
  cikis_adedi: number
  cikis_kg: number
}

export type TartiInput = {
  blok_no: number | null
  tarih: string
  tartilan_adet: number
  ortalama_kg: number
}

export type OlumInput = {
  blok_no: number | null
  tarih: string
  adet: number
  sebep: string | null
}

export type YemInput = {
  blok_no: number | null
  tarih: string
  yem_kg: number
  yem_tipi: YemTipi
}

export type SuruDonemDetay = SuruDonem & {
  bloklar: SuruBlok[]
  tartilar: SuruTarti[]
  olumler: SuruOlum[]
  yemler: SuruYem[]
}

export const YEM_TIPI_LABEL: Record<YemTipi, string> = {
  baslatici: 'Başlatıcı',
  buyutme: 'Büyütme',
  bitirici: 'Bitirici',
}
