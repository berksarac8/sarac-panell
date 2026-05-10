'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hesaplaDurum } from '@/lib/odemeler/durum'
import { getEksikGunler } from '@/lib/actions/suru-metrik'
import type { Bildirim, BildirimTip } from '@/types/bildirimler'
import type { Odeme } from '@/types/odemeler'

const BILDIRIM_SELECT = `
  id, kullanici_id, tip, baslik, mesaj, link, okundu_mu, created_at
`

/**
 * Mevcut kullanıcının bildirimlerini listele.
 * okunmamis_only=true ise sadece okunmamışları çek; aksi halde son 50 bildirim.
 */
export async function listBildirimler(okunmamis_only: boolean = false): Promise<{
  error: string | null
  data: Bildirim[]
  okunmamisSayi: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [], okunmamisSayi: 0 }

  let q = supabase
    .from('bildirimler')
    .select(BILDIRIM_SELECT)
    .eq('kullanici_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (okunmamis_only) {
    q = q.eq('okundu_mu', false)
  }

  const { data, error } = await q
  if (error) return { error: error.message, data: [], okunmamisSayi: 0 }

  const rows = (data ?? []) as unknown as Bildirim[]
  const okunmamisSayi = rows.filter((b) => !b.okundu_mu).length

  return { error: null, data: rows, okunmamisSayi }
}

export async function markBildirimOkundu(id: string): Promise<{
  ok?: true
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { error } = await supabase
    .from('bildirimler')
    .update({ okundu_mu: true })
    .eq('id', id)
    .eq('kullanici_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/')
  return { ok: true }
}

export async function markAllBildirimOkundu(): Promise<{
  ok?: true
  sayisi?: number
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { error, count } = await supabase
    .from('bildirimler')
    .update({ okundu_mu: true }, { count: 'exact' })
    .eq('kullanici_id', user.id)
    .eq('okundu_mu', false)
  if (error) return { error: error.message }

  revalidatePath('/')
  return { ok: true, sayisi: count ?? 0 }
}

/**
 * Mevcut kullanıcı için bildirim üret (internal use).
 * Aynı tip + başlık daha önce (son 7 gün içinde) oluşturulduysa duplicate atma.
 */
export async function createBildirimForCurrentUser(
  tip: BildirimTip,
  baslik: string,
  mesaj?: string | null,
  link?: string | null
): Promise<{ ok?: true; error?: string; skipped?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  // Duplicate check — son 7 gün içinde aynı tip + başlık varsa skip
  const yediGunOnce = new Date()
  yediGunOnce.setDate(yediGunOnce.getDate() - 7)
  const yediGunOnceIso = yediGunOnce.toISOString()

  const { data: existing, error: existErr } = await supabase
    .from('bildirimler')
    .select('id')
    .eq('kullanici_id', user.id)
    .eq('tip', tip)
    .eq('baslik', baslik)
    .gte('created_at', yediGunOnceIso)
    .limit(1)
  if (existErr) return { error: existErr.message }
  if (existing && existing.length > 0) {
    return { ok: true, skipped: true }
  }

  const { error } = await supabase.from('bildirimler').insert({
    kullanici_id: user.id,
    tip,
    baslik,
    mesaj: mesaj ?? null,
    link: link ?? null,
  })
  if (error) return { error: error.message }

  return { ok: true }
}

/**
 * Mevcut kullanıcı için tüm sistemdeki kontrolleri yap ve gerekirse bildirim üret.
 * Günlük cron'da çağrılır (Settings → "Bildirimleri Şimdi Üret" butonu da kullanır).
 *
 * Kontroller:
 * - Vadesi geçmiş ödenmemiş ödemeler → 'odeme_gecikmis'
 * - 3 gün içinde vadesi dolacak ödemeler → 'odeme_yaklasan'
 * - Aktif sürü → 38. günden büyükse 'suru_kapanis_yaklasan'
 * - Aktif sürüdeki eksik günler 3+ ise 'eksik_gun'
 */
export async function dailyBildirimUret(): Promise<{
  ok?: true
  uretildi?: number
  atlandi?: number
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  let uretildi = 0
  let atlandi = 0
  const today = new Date()

  // 1) Ödenmemiş ödemeler
  const { data: odemelerRaw, error: odemeErr } = await supabase
    .from('odemeler')
    .select(
      `id, aciklama, kategori_id, tutar, vade_tarihi, kime, notlar,
       odendi_mi, odeme_tarihi, tekrar_grubu_id, olusturan, created_at, updated_at`
    )
    .eq('odendi_mi', false)
    .order('vade_tarihi', { ascending: true })
  if (odemeErr) return { error: odemeErr.message }

  const odemeler = (odemelerRaw ?? []) as unknown as Odeme[]
  for (const o of odemeler) {
    const durum = hesaplaDurum(o, today)
    if (durum === 'gecikmis') {
      const tutarStr = Number(o.tutar).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const res = await createBildirimForCurrentUser(
        'odeme_gecikmis',
        `Gecikmiş ödeme: ${o.aciklama}`,
        `Vade: ${o.vade_tarihi} • Tutar: ${tutarStr} ₺${o.kime ? ' • ' + o.kime : ''}`,
        '/odemeler'
      )
      if (res.skipped) atlandi++
      else if (res.ok) uretildi++
    } else if (durum === 'yaklasan') {
      const tutarStr = Number(o.tutar).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const res = await createBildirimForCurrentUser(
        'odeme_yaklasan',
        `Yaklaşan ödeme: ${o.aciklama}`,
        `Vade: ${o.vade_tarihi} • Tutar: ${tutarStr} ₺${o.kime ? ' • ' + o.kime : ''}`,
        '/odemeler'
      )
      if (res.skipped) atlandi++
      else if (res.ok) uretildi++
    }
  }

  // 2) Aktif sürü kapanış yaklaşıyor + eksik günler
  const { data: aktifDonem, error: donemErr } = await supabase
    .from('suru_donemleri')
    .select('id, donem_no, giris_tarihi, durum')
    .eq('durum', 'aktif')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (donemErr) return { error: donemErr.message }

  if (aktifDonem) {
    const giris = new Date(aktifDonem.giris_tarihi + 'T00:00:00Z')
    const todayUtc = new Date(today.toISOString().slice(0, 10) + 'T00:00:00Z')
    const gunFark = Math.floor(
      (todayUtc.getTime() - giris.getTime()) / (1000 * 60 * 60 * 24)
    )
    const gunNo = gunFark + 1 // 1. gün = giriş günü

    // Broiler dönemi tipik 42 gün; 38+ kapanış yaklaşıyor
    if (gunNo >= 38 && gunNo <= 45) {
      const res = await createBildirimForCurrentUser(
        'suru_kapanis_yaklasan',
        `Sürü kapanışı yaklaşıyor (Dönem ${aktifDonem.donem_no})`,
        `Aktif sürü ${gunNo}. günde. Kapanış için hazırlık zamanı.`,
        `/suru/${aktifDonem.donem_no}`
      )
      if (res.skipped) atlandi++
      else if (res.ok) uretildi++
    }

    // Eksik günler
    const eksik = await getEksikGunler(aktifDonem.id as string)
    if (!eksik.error && eksik.data.length >= 3) {
      const res = await createBildirimForCurrentUser(
        'eksik_gun',
        `Eksik veri uyarısı (Dönem ${aktifDonem.donem_no})`,
        `Aktif sürüde ${eksik.data.length} eksik gün/blok var. Su veya ölüm verisi girilmemiş.`,
        `/suru/${aktifDonem.donem_no}`
      )
      if (res.skipped) atlandi++
      else if (res.ok) uretildi++
    }
  }

  revalidatePath('/')
  return { ok: true, uretildi, atlandi }
}
