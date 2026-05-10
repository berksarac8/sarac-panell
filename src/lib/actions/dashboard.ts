'use server'

import { createClient } from '@/lib/supabase/server'
import { hesaplaDurum } from '@/lib/odemeler/durum'
import type { SuruDonem } from '@/types/suru'
import type { Odeme, OdemeDurum, OdemeKategori } from '@/types/odemeler'
import type { CiftlikOlay } from '@/types/olaylar'

export type DashboardData = {
  error: string | null
  aktifDonem: SuruDonem | null
  // Tartı/ölüm özet (aktif dönem için)
  donemOzet: {
    sonTartiOrtKg: number | null
    sonTartiTarih: string | null
    son7GunOlumToplam: number
  } | null
  // Yaklaşan + gecikmiş (durum ön-hesaplı)
  acilOdemeler: (Odeme & { _durum: OdemeDurum })[]
  // Son 5 olay
  sonOlaylar: CiftlikOlay[]
  // Form dialog'larını seedlemek için
  odemeKategorileri: OdemeKategori[]
}

const DONEM_SELECT = `
  id, donem_no, giris_tarihi, durum, notlar, olusturan, created_at,
  bloklar:suru_bloklari(id, donem_id, blok_no, giris_adedi, cikis_tarihi, cikis_adedi, cikis_kg)
`

const ODEME_SELECT = `
  id, aciklama, kategori_id, tutar, vade_tarihi, kime, notlar,
  odendi_mi, odeme_tarihi, tekrar_grubu_id, olusturan, created_at, updated_at,
  kategori:odeme_kategorileri(id, isim, renk)
`

const OLAY_SELECT = `
  id, tarih, kategori_id, baslik, aciklama, kisi_firma, donem_id,
  olusturan, created_at, updated_at,
  kategori:olay_kategorileri(id, isim, renk),
  donem:suru_donemleri(id, donem_no, durum)
`

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: 'Yetkisiz',
      aktifDonem: null,
      donemOzet: null,
      acilOdemeler: [],
      sonOlaylar: [],
      odemeKategorileri: [],
    }
  }

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const yediGunOnce = new Date(today)
  yediGunOnce.setDate(yediGunOnce.getDate() - 7)
  const yediGunOnceIso = yediGunOnce.toISOString().slice(0, 10)

  const [donemRes, odemelerRes, olaylarRes, katsRes] = await Promise.all([
    supabase
      .from('suru_donemleri')
      .select(DONEM_SELECT)
      .eq('durum', 'aktif')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Sadece ödenmemişleri çek; durum (gecikmiş/yaklaşan) JS'te hesaplanır
    supabase
      .from('odemeler')
      .select(ODEME_SELECT)
      .eq('odendi_mi', false)
      .order('vade_tarihi', { ascending: true }),
    supabase
      .from('ciftlik_olaylari')
      .select(OLAY_SELECT)
      .order('tarih', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('odeme_kategorileri').select('id, isim, renk').order('isim'),
  ])

  if (donemRes.error) {
    return {
      error: donemRes.error.message,
      aktifDonem: null,
      donemOzet: null,
      acilOdemeler: [],
      sonOlaylar: [],
      odemeKategorileri: [],
    }
  }

  const aktifDonem = (donemRes.data as unknown as SuruDonem | null) ?? null

  // Aktif dönem varsa son tartı + son 7 gün ölüm toplamı
  let donemOzet: DashboardData['donemOzet'] = null
  if (aktifDonem) {
    const [tartiRes, olumRes] = await Promise.all([
      supabase
        .from('suru_tarti')
        .select('tarih, ortalama_kg')
        .eq('donem_id', aktifDonem.id)
        .order('tarih', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('suru_olum')
        .select('adet')
        .eq('donem_id', aktifDonem.id)
        .gte('tarih', yediGunOnceIso)
        .lte('tarih', todayIso),
    ])

    const son7GunOlumToplam = (olumRes.data ?? []).reduce(
      (s: number, r: { adet: number }) => s + Number(r.adet ?? 0),
      0
    )

    donemOzet = {
      sonTartiOrtKg: tartiRes.data ? Number(tartiRes.data.ortalama_kg) : null,
      sonTartiTarih: tartiRes.data?.tarih ?? null,
      son7GunOlumToplam,
    }
  }

  const odemeler = (odemelerRes.data ?? []) as unknown as Odeme[]
  const acilOdemeler = odemeler
    .map((o) => ({ ...o, _durum: hesaplaDurum(o, today) as OdemeDurum }))
    .filter((o) => o._durum === 'gecikmis' || o._durum === 'yaklasan')
    .sort((a, b) => {
      // Gecikmişler en üstte; içlerinde vade ascending
      if (a._durum !== b._durum) return a._durum === 'gecikmis' ? -1 : 1
      return a.vade_tarihi.localeCompare(b.vade_tarihi)
    })

  const sonOlaylar = (olaylarRes.data ?? []) as unknown as CiftlikOlay[]
  const odemeKategorileri = (katsRes.data ?? []) as OdemeKategori[]

  return {
    error: null,
    aktifDonem,
    donemOzet,
    acilOdemeler,
    sonOlaylar,
    odemeKategorileri,
  }
}
