'use server'

import { createClient } from '@/lib/supabase/server'
import { hesaplaKapanisRaporu, type DonemKapanisRapor } from '@/lib/suru/kapanis-raporu'
import { getSuruDonemByNo } from '@/lib/actions/suru'
import type { BanvitReferans, SuruSuKaydi } from '@/types/suru-metrik'
import type { SuruBlok } from '@/types/suru'

/**
 * Verilen dönem no için kapanış raporunu hesaplar (saf helper'ı çağırır).
 * Aktif sürü için de çalışır ama anlamlı sonuç ancak kapanmış sürüde gelir.
 */
export async function getKapanisRaporu(donemNo: string): Promise<{
  error: string | null
  data: DonemKapanisRapor | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: null }

  const { error: donemErr, data: detay } = await getSuruDonemByNo(donemNo)
  if (donemErr) return { error: donemErr, data: null }
  if (!detay) return { error: 'Dönem bulunamadı', data: null }

  // Su kayıtları + banvit referansı paralel
  const [suRes, banvitRes] = await Promise.all([
    supabase
      .from('suru_su')
      .select('id, donem_id, blok_no, tarih, gun_no, su_litre')
      .eq('donem_id', detay.id),
    supabase
      .from('banvit_referans')
      .select('gun_no, beklenen_su_ml, beklenen_yem_gr, beklenen_cumulative_gr')
      .order('gun_no', { ascending: true }),
  ])

  if (suRes.error) return { error: suRes.error.message, data: null }
  if (banvitRes.error) return { error: banvitRes.error.message, data: null }

  const sular = (suRes.data ?? []) as SuruSuKaydi[]
  const banvitRefs = (banvitRes.data ?? []) as BanvitReferans[]

  const rapor = hesaplaKapanisRaporu({
    donem: detay,
    bloklar: detay.bloklar as SuruBlok[],
    sular,
    olumler: detay.olumler,
    banvitRefs,
  })

  return { error: null, data: rapor }
}

/**
 * Bir dönem detayını (tartılar + bloklar) rapor sayfasında karşılaştırma
 * tablosu kullansın diye döner. Sade bir wrapper.
 */
export async function getRaporDetay(donemNo: string) {
  return getSuruDonemByNo(donemNo)
}

// ============================================================================
// Geçmiş sürü grafiği (Task 3 — son N kapalı dönem)
// ============================================================================

export type GecmisSuruMetrik = {
  donemNo: string
  fcr: number | null
  kayipYuzde: number | null
  ortalamaKg: number | null
}

/**
 * Son N kapalı dönemin metriklerini döner (varsayılan 5).
 * Sıralama: dönem_no asc (en eski → en yeni; grafikte x ekseni soldan sağa).
 */
export async function getGecmisSuruMetrikleri(n = 5): Promise<{
  error: string | null
  data: GecmisSuruMetrik[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  // Son N kapalı dönemi çek (created_at desc)
  const { data: donemler, error: donemErr } = await supabase
    .from('suru_donemleri')
    .select('id, donem_no, giris_tarihi, durum, notlar, olusturan, created_at')
    .eq('durum', 'kapali')
    .order('created_at', { ascending: false })
    .limit(n)

  if (donemErr) return { error: donemErr.message, data: [] }
  if (!donemler || donemler.length === 0) return { error: null, data: [] }

  // Banvit referansı (tüm dönemler için tek sefer)
  const banvitRes = await supabase
    .from('banvit_referans')
    .select('gun_no, beklenen_su_ml, beklenen_yem_gr, beklenen_cumulative_gr')
    .order('gun_no', { ascending: true })
  if (banvitRes.error) return { error: banvitRes.error.message, data: [] }
  const banvitRefs = (banvitRes.data ?? []) as BanvitReferans[]

  // Her dönem için: bloklar + ölüm + su paralel çekilir → helper'a verilir
  const sonuc: GecmisSuruMetrik[] = []

  for (const d of donemler) {
    const [blokRes, olumRes, suRes] = await Promise.all([
      supabase
        .from('suru_bloklari')
        .select('id, donem_id, blok_no, giris_adedi, cikis_tarihi, cikis_adedi, cikis_kg')
        .eq('donem_id', d.id),
      supabase
        .from('suru_olum')
        .select('id, donem_id, blok_no, tarih, adet, sebep')
        .eq('donem_id', d.id),
      supabase
        .from('suru_su')
        .select('id, donem_id, blok_no, tarih, gun_no, su_litre')
        .eq('donem_id', d.id),
    ])

    if (blokRes.error || olumRes.error || suRes.error) {
      // Bir dönem hatası tüm grafiği bozmasın → atla
      continue
    }

    const rapor = hesaplaKapanisRaporu({
      donem: d as Parameters<typeof hesaplaKapanisRaporu>[0]['donem'],
      bloklar: (blokRes.data ?? []) as SuruBlok[],
      sular: (suRes.data ?? []) as SuruSuKaydi[],
      olumler: (olumRes.data ?? []) as Parameters<typeof hesaplaKapanisRaporu>[0]['olumler'],
      banvitRefs,
    })

    sonuc.push({
      donemNo: rapor.donemNo,
      fcr: rapor.fcr,
      kayipYuzde: rapor.kayipYuzde,
      ortalamaKg: rapor.ortalamaKg,
    })
  }

  // donem_no asc (en eski → en yeni)
  sonuc.sort((a, b) => (a.donemNo < b.donemNo ? -1 : a.donemNo > b.donemNo ? 1 : 0))

  return { error: null, data: sonuc }
}
