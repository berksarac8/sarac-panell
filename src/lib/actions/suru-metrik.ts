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
