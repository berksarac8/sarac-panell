export type BildirimTip =
  | 'odeme_yaklasan'
  | 'odeme_gecikmis'
  | 'suru_kapanis_yaklasan'
  | 'eksik_gun'
  | 'sistem'

export type Bildirim = {
  id: string
  kullanici_id: string
  tip: BildirimTip
  baslik: string
  mesaj: string | null
  link: string | null
  okundu_mu: boolean
  created_at: string
}
