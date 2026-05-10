/**
 * Günlük cron endpoint'i — tüm kullanıcılar için in-app bildirim üretir.
 *
 * Bu route service-role anahtarıyla çalışır (RLS bypass — kullanıcı bağlamı yok).
 * Her aktif profil için:
 *   - Gecikmiş ödemeler → 'odeme_gecikmis'
 *   - 3 gün içinde yaklaşan ödemeler → 'odeme_yaklasan'
 *   - Aktif sürü 38+ gün → 'suru_kapanis_yaklasan'
 *   - Aktif sürüde 3+ eksik gün → 'eksik_gun'
 *
 * Duplicate koruması: aynı tip+başlık 7 gün içinde varsa skip.
 *
 * Yetkilendirme: `CRON_SECRET` header zorunlu (üretimde).
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OdemeRow = {
  id: string
  aciklama: string
  tutar: number
  vade_tarihi: string
  kime: string | null
  odendi_mi: boolean
}

type DonemRow = {
  id: string
  donem_no: string
  giris_tarihi: string
  durum: 'aktif' | 'kapali'
}

// Service-role client'ı schema-typed-değil; helper'larda 'any' kabul ediyoruz.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupaClient = any

/** YYYY-MM-DD bazında bugünden vade'ye kalan gün */
function kalanGun(vade: string, bugunIso: string): number {
  const v = new Date(vade + 'T00:00:00Z').getTime()
  const b = new Date(bugunIso + 'T00:00:00Z').getTime()
  return Math.floor((v - b) / (1000 * 60 * 60 * 24))
}

async function duplicateVar(
  supabase: SupaClient,
  kullaniciId: string,
  tip: string,
  baslik: string
): Promise<boolean> {
  const yediGunOnce = new Date()
  yediGunOnce.setDate(yediGunOnce.getDate() - 7)
  const { data } = await supabase
    .from('bildirimler')
    .select('id')
    .eq('kullanici_id', kullaniciId)
    .eq('tip', tip)
    .eq('baslik', baslik)
    .gte('created_at', yediGunOnce.toISOString())
    .limit(1)
  return Array.isArray(data) && data.length > 0
}

async function insertBildirim(
  supabase: SupaClient,
  kullaniciId: string,
  tip: string,
  baslik: string,
  mesaj: string | null,
  link: string | null
): Promise<boolean> {
  if (await duplicateVar(supabase, kullaniciId, tip, baslik)) return false
  const { error } = await supabase.from('bildirimler').insert({
    kullanici_id: kullaniciId,
    tip,
    baslik,
    mesaj,
    link,
  })
  return !error
}

function gunNoHesapla(girisTarihi: string, hedefIso: string): number {
  const g = new Date(girisTarihi + 'T00:00:00Z').getTime()
  const h = new Date(hedefIso + 'T00:00:00Z').getTime()
  return Math.floor((h - g) / (1000 * 60 * 60 * 24)) + 1
}

async function eksikGunSayisi(
  supabase: SupaClient,
  donem: DonemRow,
  bugunIso: string
): Promise<number> {
  const gunBugun = gunNoHesapla(donem.giris_tarihi, bugunIso) - 1
  if (gunBugun < 1) return 0

  const { data: bloklar } = await supabase
    .from('suru_bloklari')
    .select('blok_no, cikis_tarihi')
    .eq('donem_id', donem.id)

  const aktifBloklar = ((bloklar ?? []) as Array<{
    blok_no: number
    cikis_tarihi: string | null
  }>).filter((b) => !b.cikis_tarihi)

  if (aktifBloklar.length === 0) return 0

  const [suRes, olumRes] = await Promise.all([
    supabase
      .from('suru_su')
      .select('blok_no, gun_no')
      .eq('donem_id', donem.id),
    supabase
      .from('suru_olum')
      .select('blok_no, tarih')
      .eq('donem_id', donem.id),
  ])

  const suSet = new Set<string>()
  for (const r of (suRes.data ?? []) as Array<{ blok_no: number; gun_no: number }>) {
    suSet.add(`${r.blok_no}-${r.gun_no}`)
  }
  const olumByGun = new Map<number, Set<number | 'genel'>>()
  for (const r of (olumRes.data ?? []) as Array<{
    blok_no: number | null
    tarih: string
  }>) {
    const g = gunNoHesapla(donem.giris_tarihi, r.tarih)
    if (g < 1) continue
    const set = olumByGun.get(g) ?? new Set<number | 'genel'>()
    set.add(r.blok_no ?? 'genel')
    olumByGun.set(g, set)
  }

  let toplam = 0
  for (const blok of aktifBloklar) {
    for (let g = 1; g <= gunBugun; g++) {
      const suYok = !suSet.has(`${blok.blok_no}-${g}`)
      const olumSet = olumByGun.get(g)
      const olumYok = !olumSet || (!olumSet.has(blok.blok_no) && !olumSet.has('genel'))
      if (suYok || olumYok) toplam++
    }
  }
  return toplam
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase credentials missing' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const bugunIso = new Date().toISOString().slice(0, 10)

  // Tüm profilleri çek
  const { data: profiller, error: profErr } = await supabase
    .from('profiles')
    .select('id')
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  // Tüm ödenmemiş ödemeler
  const { data: odemelerData } = await supabase
    .from('odemeler')
    .select('id, aciklama, tutar, vade_tarihi, kime, odendi_mi')
    .eq('odendi_mi', false)
    .order('vade_tarihi', { ascending: true })
  const odemeler = (odemelerData ?? []) as OdemeRow[]

  // Aktif sürü
  const { data: donemData } = await supabase
    .from('suru_donemleri')
    .select('id, donem_no, giris_tarihi, durum')
    .eq('durum', 'aktif')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const aktifDonem = (donemData as DonemRow | null) ?? null

  let toplamUretildi = 0

  for (const profil of (profiller ?? []) as Array<{ id: string }>) {
    // Ödemeler
    for (const o of odemeler) {
      const kalan = kalanGun(o.vade_tarihi, bugunIso)
      const tutarStr = Number(o.tutar).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      if (kalan < 0) {
        // Gecikmiş
        const created = await insertBildirim(
          supabase,
          profil.id,
          'odeme_gecikmis',
          `Gecikmiş ödeme: ${o.aciklama}`,
          `Vade: ${o.vade_tarihi} • Tutar: ${tutarStr} ₺${o.kime ? ' • ' + o.kime : ''}`,
          '/odemeler'
        )
        if (created) toplamUretildi++
      } else if (kalan >= 0 && kalan <= 3) {
        // Yaklaşan
        const created = await insertBildirim(
          supabase,
          profil.id,
          'odeme_yaklasan',
          `Yaklaşan ödeme: ${o.aciklama}`,
          `Vade: ${o.vade_tarihi} • Tutar: ${tutarStr} ₺${o.kime ? ' • ' + o.kime : ''}`,
          '/odemeler'
        )
        if (created) toplamUretildi++
      }
    }

    // Aktif sürü
    if (aktifDonem) {
      const gunNo = gunNoHesapla(aktifDonem.giris_tarihi, bugunIso)
      if (gunNo >= 38 && gunNo <= 45) {
        const created = await insertBildirim(
          supabase,
          profil.id,
          'suru_kapanis_yaklasan',
          `Sürü kapanışı yaklaşıyor (Dönem ${aktifDonem.donem_no})`,
          `Aktif sürü ${gunNo}. günde. Kapanış için hazırlık zamanı.`,
          `/suru/${aktifDonem.donem_no}`
        )
        if (created) toplamUretildi++
      }

      const eksik = await eksikGunSayisi(supabase, aktifDonem, bugunIso)
      if (eksik >= 3) {
        const created = await insertBildirim(
          supabase,
          profil.id,
          'eksik_gun',
          `Eksik veri uyarısı (Dönem ${aktifDonem.donem_no})`,
          `Aktif sürüde ${eksik} eksik gün/blok var. Su veya ölüm verisi girilmemiş.`,
          `/suru/${aktifDonem.donem_no}`
        )
        if (created) toplamUretildi++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    profilSayisi: profiller?.length ?? 0,
    bildirimUretildi: toplamUretildi,
  })
}
