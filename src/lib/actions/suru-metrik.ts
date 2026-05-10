'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hesaplaBlokGunluk } from '@/lib/suru-metrik/hesapla'
import type {
  BanvitReferans,
  BlokGunlukMetrik,
  SuruSuKaydi,
} from '@/types/suru-metrik'

type SuruDonemRow = { id: string; donem_no: string; giris_tarihi: string }
type OlumRow = { tarih: string; adet: number; blok_no: number | null }

/**
 * İki tarih (YYYY-MM-DD) arasındaki gün farkı (giris_tarihi gün 1 olarak).
 * Aynı gün → 1, ertesi gün → 2 ...
 */
function gunNoHesapla(girisTarihi: string, hedefTarih: string): number {
  const giris = new Date(girisTarihi + 'T00:00:00Z')
  const hedef = new Date(hedefTarih + 'T00:00:00Z')
  const ms = hedef.getTime() - giris.getTime()
  const gun = Math.floor(ms / (1000 * 60 * 60 * 24))
  return gun + 1
}

/**
 * Sürü dönemi için tarih + giriş tarihinden gun_no üretir.
 * Validasyon: gun_no 1-44 arasında olmalı.
 */
async function girisTarihiAl(donemId: string): Promise<{
  error: string | null
  giris_tarihi?: string
  donem_no?: string
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suru_donemleri')
    .select('id, donem_no, giris_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Dönem bulunamadı' }
  const row = data as SuruDonemRow
  return { error: null, giris_tarihi: row.giris_tarihi, donem_no: row.donem_no }
}

async function revalidateDonem(donemNo: string | undefined) {
  revalidatePath('/suru')
  revalidatePath('/')
  if (donemNo) revalidatePath(`/suru/${donemNo}`)
}

// ============================================================================
// Su CRUD
// ============================================================================

export async function addSu(
  donemId: string,
  blokNo: 1 | 2 | 3,
  tarih: string,
  gunNo: number,
  suLitre: number
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  if (![1, 2, 3].includes(blokNo)) return { error: 'Geçersiz blok' }
  if (!tarih) return { error: 'Tarih gerekli' }
  if (!Number.isInteger(gunNo) || gunNo < 1 || gunNo > 44) {
    return { error: 'Gün no 1-44 arasında olmalı' }
  }
  if (!Number.isFinite(suLitre) || suLitre < 0) {
    return { error: 'Su litre geçersiz' }
  }

  const donem = await girisTarihiAl(donemId)
  if (donem.error) return { error: donem.error }

  const { error } = await supabase.from('suru_su').insert({
    donem_id: donemId,
    blok_no: blokNo,
    tarih,
    gun_no: gunNo,
    su_litre: suLitre,
  })
  if (error) return { error: error.message }

  await revalidateDonem(donem.donem_no)
  return { ok: true }
}

export async function updateSu(
  id: string,
  suLitre: number
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  if (!Number.isFinite(suLitre) || suLitre < 0) {
    return { error: 'Su litre geçersiz' }
  }

  const { data, error } = await supabase
    .from('suru_su')
    .update({ su_litre: suLitre })
    .eq('id', id)
    .select('donem_id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Güncellenemedi' }

  const donem = await girisTarihiAl((data as { donem_id: string }).donem_id)
  await revalidateDonem(donem.donem_no)
  return { ok: true }
}

export async function deleteSu(id: string): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { data: mevcut, error: selErr } = await supabase
    .from('suru_su')
    .select('donem_id')
    .eq('id', id)
    .single()
  if (selErr || !mevcut) return { error: selErr?.message ?? 'Bulunamadı' }

  const { error } = await supabase.from('suru_su').delete().eq('id', id)
  if (error) return { error: error.message }

  const donem = await girisTarihiAl((mevcut as { donem_id: string }).donem_id)
  await revalidateDonem(donem.donem_no)
  return { ok: true }
}

// ============================================================================
// Blok metrikleri (helper kullanır)
// ============================================================================

export async function getBlokMetrikleri(
  donemId: string,
  blokNo: 1 | 2 | 3
): Promise<{ error: string | null; data: BlokGunlukMetrik[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  if (![1, 2, 3].includes(blokNo)) return { error: 'Geçersiz blok', data: [] }

  // Dönem + giriş tarihi
  const donemRes = await supabase
    .from('suru_donemleri')
    .select('id, donem_no, giris_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (donemRes.error) return { error: donemRes.error.message, data: [] }
  if (!donemRes.data) return { error: 'Dönem bulunamadı', data: [] }
  const donem = donemRes.data as SuruDonemRow

  // Bloğun giriş adedi
  const blokRes = await supabase
    .from('suru_bloklari')
    .select('giris_adedi')
    .eq('donem_id', donemId)
    .eq('blok_no', blokNo)
    .maybeSingle()
  if (blokRes.error) return { error: blokRes.error.message, data: [] }
  if (!blokRes.data) return { error: 'Blok bulunamadı', data: [] }
  const giris_adedi = (blokRes.data as { giris_adedi: number }).giris_adedi

  // Paralel: ölümler, su, banvit
  const [olumRes, suRes, banvitRes] = await Promise.all([
    supabase
      .from('suru_olum')
      .select('tarih, adet, blok_no')
      .eq('donem_id', donemId)
      .or(`blok_no.eq.${blokNo},blok_no.is.null`),
    supabase
      .from('suru_su')
      .select('id, donem_id, blok_no, tarih, gun_no, su_litre')
      .eq('donem_id', donemId)
      .eq('blok_no', blokNo)
      .order('gun_no', { ascending: true }),
    supabase
      .from('banvit_referans')
      .select('gun_no, beklenen_su_ml, beklenen_yem_gr, beklenen_cumulative_gr')
      .order('gun_no', { ascending: true }),
  ])

  if (olumRes.error) return { error: olumRes.error.message, data: [] }
  if (suRes.error) return { error: suRes.error.message, data: [] }
  if (banvitRes.error) return { error: banvitRes.error.message, data: [] }

  const olumler = ((olumRes.data ?? []) as OlumRow[])
    .map((o) => ({
      gun_no: gunNoHesapla(donem.giris_tarihi, o.tarih),
      adet: o.adet,
    }))
    .filter((o) => o.gun_no >= 1)

  const suler = (suRes.data ?? []) as SuruSuKaydi[]
  const sulerInput = suler.map((s) => ({ gun_no: s.gun_no, su_litre: Number(s.su_litre) }))

  const tarihler = suler.map((s) => ({ gun_no: s.gun_no, tarih: s.tarih }))

  const banvitReferans = (banvitRes.data ?? []) as BanvitReferans[]

  const metrikler = hesaplaBlokGunluk({
    giris_adedi,
    olumler,
    suler: sulerInput,
    banvitReferans,
    tarihler,
  })

  return { error: null, data: metrikler }
}

// ============================================================================
// Veri Gir — su + ölüm upsert (tek dialog)
// ============================================================================

type UpsertSonuc = {
  ok?: true
  error?: string
  /** Hangi kayıtlar işlendi (UI feedback için) */
  yapildi?: { su: 'insert' | 'update' | null; olum: 'insert' | 'update' | null }
}

/**
 * Bir gün için su ve/veya ölüm girer (upsert).
 *
 * - suLitre verilirse: (donem_id, blok_no, gun_no) üzerinden suru_su kaydını
 *   upsert eder. Mevcutsa update, yoksa insert.
 * - olumAdet verilirse: (donem_id, blok_no, tarih) üzerinden suru_olum kaydını
 *   upsert eder (suru_olum'da unique constraint yok; mantıksal upsert).
 * - İkisi de null/undefined ise hata döner.
 * - blokNo geçersizse hata.
 */
export async function upsertGunlukVeri(
  donemId: string,
  blokNo: 1 | 2 | 3,
  tarih: string,
  suLitre?: number | null,
  olumAdet?: number | null,
  olumSebep?: string | null
): Promise<UpsertSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  if (![1, 2, 3].includes(blokNo)) return { error: 'Geçersiz blok' }
  if (!tarih) return { error: 'Tarih gerekli' }

  const suGirildi = suLitre !== null && suLitre !== undefined
  const olumGirildi = olumAdet !== null && olumAdet !== undefined

  if (!suGirildi && !olumGirildi) {
    return { error: 'En az bir alan girin (su veya ölüm)' }
  }

  if (suGirildi && (!Number.isFinite(suLitre) || (suLitre as number) < 0)) {
    return { error: 'Su litre geçersiz' }
  }
  if (
    olumGirildi &&
    (!Number.isInteger(olumAdet) || (olumAdet as number) < 0)
  ) {
    return { error: 'Ölüm adedi geçersiz' }
  }

  const donem = await girisTarihiAl(donemId)
  if (donem.error || !donem.giris_tarihi) {
    return { error: donem.error ?? 'Dönem bulunamadı' }
  }

  const gunNo = gunNoHesapla(donem.giris_tarihi, tarih)
  if (suGirildi && (gunNo < 1 || gunNo > 44)) {
    return {
      error:
        gunNo < 1
          ? 'Tarih dönem giriş tarihinden önce olamaz'
          : 'Bu tarih için referans yok (gün > 44)',
    }
  }

  const yapildi: NonNullable<UpsertSonuc['yapildi']> = { su: null, olum: null }

  // Su upsert
  if (suGirildi) {
    const { data: mevcut, error: selErr } = await supabase
      .from('suru_su')
      .select('id')
      .eq('donem_id', donemId)
      .eq('blok_no', blokNo)
      .eq('gun_no', gunNo)
      .maybeSingle()
    if (selErr) return { error: selErr.message }

    if (mevcut) {
      const { error } = await supabase
        .from('suru_su')
        .update({ su_litre: suLitre as number })
        .eq('id', (mevcut as { id: string }).id)
      if (error) return { error: error.message }
      yapildi.su = 'update'
    } else {
      const { error } = await supabase.from('suru_su').insert({
        donem_id: donemId,
        blok_no: blokNo,
        tarih,
        gun_no: gunNo,
        su_litre: suLitre as number,
      })
      if (error) return { error: error.message }
      yapildi.su = 'insert'
    }
  }

  // Ölüm upsert (mantıksal, unique constraint yok)
  if (olumGirildi) {
    const { data: mevcutOlum, error: selErr } = await supabase
      .from('suru_olum')
      .select('id')
      .eq('donem_id', donemId)
      .eq('blok_no', blokNo)
      .eq('tarih', tarih)
      .maybeSingle()
    if (selErr) return { error: selErr.message }

    const sebepNorm = olumSebep && olumSebep.trim() ? olumSebep.trim() : null

    if (mevcutOlum) {
      const { error } = await supabase
        .from('suru_olum')
        .update({ adet: olumAdet as number, sebep: sebepNorm })
        .eq('id', (mevcutOlum as { id: string }).id)
      if (error) return { error: error.message }
      yapildi.olum = 'update'
    } else {
      const { error } = await supabase.from('suru_olum').insert({
        donem_id: donemId,
        blok_no: blokNo,
        tarih,
        adet: olumAdet as number,
        sebep: sebepNorm,
      })
      if (error) return { error: error.message }
      yapildi.olum = 'insert'
    }
  }

  await revalidateDonem(donem.donem_no)
  return { ok: true, yapildi }
}

/**
 * Aktif dönem için "eksik gün" tespiti.
 *
 * Her blok × her gün (1 .. gunSayisi) için: o gün su girilmiş mi, ölüm
 * girilmiş mi (blok-spesifik veya genel) kontrol edilir. En az biri eksikse
 * o satır döner.
 *
 * "Bugün" dahil edilmez (henüz tamamlanmamış gün eksik sayılmaz) — yani
 * gun_no ≤ gunSayisi (bugün dahil değil, yani dünden geriye kadar).
 */
export type EksikGunSatir = {
  blokNo: 1 | 2 | 3
  gunNo: number
  tarih: string
  suEksik: boolean
  olumEksik: boolean
}

export async function getEksikGunler(donemId: string): Promise<{
  error: string | null
  data: EksikGunSatir[]
  toplamGun: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [], toplamGun: 0 }

  // Dönem + bloklar
  const donemRes = await supabase
    .from('suru_donemleri')
    .select('id, giris_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (donemRes.error) return { error: donemRes.error.message, data: [], toplamGun: 0 }
  if (!donemRes.data) return { error: 'Dönem bulunamadı', data: [], toplamGun: 0 }
  const girisTarihi = (donemRes.data as { giris_tarihi: string }).giris_tarihi

  const bloklarRes = await supabase
    .from('suru_bloklari')
    .select('blok_no, cikis_tarihi')
    .eq('donem_id', donemId)
  if (bloklarRes.error) return { error: bloklarRes.error.message, data: [], toplamGun: 0 }

  const bloklar = (bloklarRes.data ?? []) as { blok_no: 1 | 2 | 3; cikis_tarihi: string | null }[]

  // Bugün (UTC bazında) — bugün dahil değil
  const bugun = new Date()
  const bugunIso = bugun.toISOString().slice(0, 10)
  const gunSayisi = gunNoHesapla(girisTarihi, bugunIso) - 1 // dünden geriye

  if (gunSayisi < 1) {
    return { error: null, data: [], toplamGun: 0 }
  }

  // Tüm su ve ölüm verisi (dönem geneli) — sonra blok+gün üzerinden kontrol
  const [suRes, olumRes] = await Promise.all([
    supabase
      .from('suru_su')
      .select('blok_no, gun_no')
      .eq('donem_id', donemId),
    supabase
      .from('suru_olum')
      .select('blok_no, tarih')
      .eq('donem_id', donemId),
  ])
  if (suRes.error) return { error: suRes.error.message, data: [], toplamGun: gunSayisi }
  if (olumRes.error) return { error: olumRes.error.message, data: [], toplamGun: gunSayisi }

  const suSet = new Set<string>() // key: `${blok_no}-${gun_no}`
  for (const r of (suRes.data ?? []) as { blok_no: number; gun_no: number }[]) {
    suSet.add(`${r.blok_no}-${r.gun_no}`)
  }
  // Ölüm için: tarih → gun_no; blok null ise "genel" sayılır → tüm bloklar için karşılanır
  const olumByGun = new Map<number, Set<number | 'genel'>>() // gun_no → bloklar
  for (const r of (olumRes.data ?? []) as { blok_no: number | null; tarih: string }[]) {
    const gun = gunNoHesapla(girisTarihi, r.tarih)
    if (gun < 1) continue
    const set = olumByGun.get(gun) ?? new Set<number | 'genel'>()
    set.add(r.blok_no ?? 'genel')
    olumByGun.set(gun, set)
  }

  function tarihHesapla(gunNo: number): string {
    const d = new Date(girisTarihi + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + (gunNo - 1))
    return d.toISOString().slice(0, 10)
  }

  const eksikler: EksikGunSatir[] = []
  for (const blok of bloklar) {
    // Blok kapandıysa kapanış sonrasını sayma
    let blokMaxGun = gunSayisi
    if (blok.cikis_tarihi) {
      const kapanis = gunNoHesapla(girisTarihi, blok.cikis_tarihi)
      blokMaxGun = Math.min(gunSayisi, kapanis - 1)
    }

    for (let g = 1; g <= blokMaxGun; g++) {
      const suEksik = !suSet.has(`${blok.blok_no}-${g}`)
      const olumSet = olumByGun.get(g)
      const olumEksik = !(olumSet && (olumSet.has(blok.blok_no) || olumSet.has('genel')))
      if (suEksik || olumEksik) {
        eksikler.push({
          blokNo: blok.blok_no,
          gunNo: g,
          tarih: tarihHesapla(g),
          suEksik,
          olumEksik,
        })
      }
    }
  }

  // Önce blok, sonra gun_no'ya göre sırala
  eksikler.sort((a, b) => (a.blokNo - b.blokNo) || (a.gunNo - b.gunNo))

  return { error: null, data: eksikler, toplamGun: gunSayisi }
}

/**
 * Bir blok için tüm su kayıtlarını döner (UI listesi için).
 */
export async function listSu(
  donemId: string,
  blokNo: 1 | 2 | 3
): Promise<{ error: string | null; data: SuruSuKaydi[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  if (![1, 2, 3].includes(blokNo)) return { error: 'Geçersiz blok', data: [] }

  const { data, error } = await supabase
    .from('suru_su')
    .select('id, donem_id, blok_no, tarih, gun_no, su_litre')
    .eq('donem_id', donemId)
    .eq('blok_no', blokNo)
    .order('gun_no', { ascending: true })

  if (error) return { error: error.message, data: [] }
  return { error: null, data: (data ?? []) as SuruSuKaydi[] }
}
