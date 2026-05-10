'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sonrakiDonemNo } from '@/lib/suru/donem-no'
import { hesaplaDonemDurumu } from '@/lib/suru/kapanis'
import type {
  SuruDonem,
  SuruDonemDetay,
  SuruBlok,
  SuruTarti,
  SuruOlum,
  SuruYem,
  YeniSuruInput,
  BlokKapatInput,
  YemTipi,
} from '@/types/suru'

const DONEM_SELECT = `
  id, donem_no, giris_tarihi, durum, notlar, olusturan, created_at,
  bloklar:suru_bloklari(id, donem_id, blok_no, giris_adedi, cikis_tarihi, cikis_adedi, cikis_kg)
`

export async function listSuruDonemleriFull(): Promise<{
  error: string | null
  aktifler: SuruDonem[]
  gecmisler: SuruDonem[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', aktifler: [], gecmisler: [] }

  const { data, error } = await supabase
    .from('suru_donemleri')
    .select(DONEM_SELECT)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, aktifler: [], gecmisler: [] }

  const tum = (data ?? []) as unknown as SuruDonem[]
  const aktifler = tum.filter((d) => d.durum === 'aktif')
  const gecmisler = tum.filter((d) => d.durum === 'kapali')
  return { error: null, aktifler, gecmisler }
}

export async function getActiveSuruDonemFull(): Promise<{
  error: string | null
  data: SuruDonem | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suru_donemleri')
    .select(DONEM_SELECT)
    .eq('durum', 'aktif')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { error: error.message, data: null }
  return { error: null, data: (data as SuruDonem | null) ?? null }
}

export async function getSuruDonemByNo(donemNo: string): Promise<{
  error: string | null
  data: SuruDonemDetay | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: null }

  const { data: donem, error: donemErr } = await supabase
    .from('suru_donemleri')
    .select(DONEM_SELECT)
    .eq('donem_no', donemNo)
    .maybeSingle()

  if (donemErr) return { error: donemErr.message, data: null }
  if (!donem) return { error: null, data: null }

  const donemTyped = donem as unknown as SuruDonem & { bloklar: SuruBlok[] }

  const [tartiRes, olumRes, yemRes] = await Promise.all([
    supabase
      .from('suru_tarti')
      .select('id, donem_id, blok_no, tarih, tartilan_adet, ortalama_kg')
      .eq('donem_id', donemTyped.id)
      .order('tarih', { ascending: false }),
    supabase
      .from('suru_olum')
      .select('id, donem_id, blok_no, tarih, adet, sebep')
      .eq('donem_id', donemTyped.id)
      .order('tarih', { ascending: false }),
    supabase
      .from('suru_yem')
      .select('id, donem_id, blok_no, tarih, yem_kg, yem_tipi')
      .eq('donem_id', donemTyped.id)
      .order('tarih', { ascending: false }),
  ])

  if (tartiRes.error) return { error: tartiRes.error.message, data: null }
  if (olumRes.error) return { error: olumRes.error.message, data: null }
  if (yemRes.error) return { error: yemRes.error.message, data: null }

  const detay: SuruDonemDetay = {
    ...donemTyped,
    bloklar: (donemTyped.bloklar ?? []).sort((a, b) => a.blok_no - b.blok_no),
    tartilar: (tartiRes.data ?? []) as SuruTarti[],
    olumler: (olumRes.data ?? []) as SuruOlum[],
    yemler: (yemRes.data ?? []) as SuruYem[],
  }

  return { error: null, data: detay }
}

function readYeniSuruInput(formData: FormData): YeniSuruInput | { error: string } {
  const giris_tarihi = String(formData.get('giris_tarihi') ?? '').trim()
  const blok1 = Number(formData.get('blok1_adedi') ?? 0)
  const blok2 = Number(formData.get('blok2_adedi') ?? 0)
  const blok3 = Number(formData.get('blok3_adedi') ?? 0)
  const notlar = (String(formData.get('notlar') ?? '').trim() || null) as string | null

  if (!giris_tarihi) return { error: 'Giriş tarihi gerekli' }
  for (const [ad, val] of [['Blok 1', blok1], ['Blok 2', blok2], ['Blok 3', blok3]] as const) {
    if (!Number.isInteger(val) || val < 0) return { error: `${ad} adedi geçersiz` }
  }
  if (blok1 + blok2 + blok3 === 0) {
    return { error: 'En az bir blokta civciv olmalı' }
  }

  return { giris_tarihi, blok1_adedi: blok1, blok2_adedi: blok2, blok3_adedi: blok3, notlar }
}

export async function createSuruDonem(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readYeniSuruInput(formData)
  if ('error' in parsed) return parsed

  // Yıl bazlı sıra no üret
  const yil = Number(parsed.giris_tarihi.slice(0, 4))
  if (!Number.isInteger(yil)) return { error: 'Giriş tarihi yıl ayrıştırılamadı' }

  const { data: mevcut, error: mevcutErr } = await supabase
    .from('suru_donemleri')
    .select('donem_no')
  if (mevcutErr) return { error: mevcutErr.message }

  const donem_no = sonrakiDonemNo(
    (mevcut ?? []).map((r) => r.donem_no as string),
    yil
  )

  // Dönemi insert et
  const { data: yeniDonem, error: donemErr } = await supabase
    .from('suru_donemleri')
    .insert({
      donem_no,
      giris_tarihi: parsed.giris_tarihi,
      durum: 'aktif',
      notlar: parsed.notlar,
      olusturan: user.id,
    })
    .select('id, donem_no')
    .single()
  if (donemErr || !yeniDonem) return { error: donemErr?.message ?? 'Dönem oluşturulamadı' }

  // 3 blok insert et (atomik denenir; hata olursa dönem rollback)
  const blokRows = [
    { donem_id: yeniDonem.id, blok_no: 1, giris_adedi: parsed.blok1_adedi },
    { donem_id: yeniDonem.id, blok_no: 2, giris_adedi: parsed.blok2_adedi },
    { donem_id: yeniDonem.id, blok_no: 3, giris_adedi: parsed.blok3_adedi },
  ]
  const { error: blokErr } = await supabase.from('suru_bloklari').insert(blokRows)
  if (blokErr) {
    await supabase.from('suru_donemleri').delete().eq('id', yeniDonem.id)
    return { error: blokErr.message }
  }

  revalidatePath('/suru')
  revalidatePath('/')
  return { ok: true, donem_no: yeniDonem.donem_no }
}

function readBlokKapatInput(formData: FormData): BlokKapatInput | { error: string } {
  const cikis_tarihi = String(formData.get('cikis_tarihi') ?? '').trim()
  const cikis_adedi = Number(formData.get('cikis_adedi') ?? 0)
  const cikisKgRaw = String(formData.get('cikis_kg') ?? '').replace(',', '.').trim()
  const cikis_kg = Number(cikisKgRaw)

  if (!cikis_tarihi) return { error: 'Çıkış tarihi gerekli' }
  if (!Number.isInteger(cikis_adedi) || cikis_adedi < 0) {
    return { error: 'Çıkış adedi geçersiz' }
  }
  if (!Number.isFinite(cikis_kg) || cikis_kg < 0) {
    return { error: 'Çıkış kg geçersiz' }
  }
  return { cikis_tarihi, cikis_adedi, cikis_kg }
}

export async function kapatBlok(blokId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readBlokKapatInput(formData)
  if ('error' in parsed) return parsed

  // Bloğu güncelle
  const { data: blok, error: updErr } = await supabase
    .from('suru_bloklari')
    .update({
      cikis_tarihi: parsed.cikis_tarihi,
      cikis_adedi: parsed.cikis_adedi,
      cikis_kg: parsed.cikis_kg,
    })
    .eq('id', blokId)
    .select('id, donem_id')
    .single()
  if (updErr || !blok) return { error: updErr?.message ?? 'Blok güncellenemedi' }

  // Dönem durumunu yeniden hesapla (trigger varsa idempotent — sonuç aynı)
  const { data: bloklar, error: blokErr } = await supabase
    .from('suru_bloklari')
    .select('id, donem_id, blok_no, giris_adedi, cikis_tarihi, cikis_adedi, cikis_kg')
    .eq('donem_id', blok.donem_id)
  if (blokErr) return { error: blokErr.message }

  const yeniDurum = hesaplaDonemDurumu((bloklar ?? []) as SuruBlok[])
  const { error: donemErr } = await supabase
    .from('suru_donemleri')
    .update({ durum: yeniDurum })
    .eq('id', blok.donem_id)
  if (donemErr) return { error: donemErr.message }

  // İlgili dönem için donem_no'yu çek, revalidate et
  const { data: donem } = await supabase
    .from('suru_donemleri')
    .select('donem_no')
    .eq('id', blok.donem_id)
    .single()

  revalidatePath('/suru')
  revalidatePath('/')
  if (donem?.donem_no) revalidatePath(`/suru/${donem.donem_no}`)
  return { ok: true, durum: yeniDurum }
}

function intOr(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? '').trim()
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 3) return null
  return n
}

function decimal(formData: FormData, key: string): number {
  return Number(String(formData.get(key) ?? '').replace(',', '.').trim())
}

export async function addTarti(donemId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const tarih = String(formData.get('tarih') ?? '').trim()
  const blok_no = intOr(formData, 'blok_no')
  const tartilan_adet = Number(formData.get('tartilan_adet') ?? 0)
  const ortalama_kg = decimal(formData, 'ortalama_kg')

  if (!tarih) return { error: 'Tarih gerekli' }
  if (!Number.isInteger(tartilan_adet) || tartilan_adet < 1) {
    return { error: 'Tartılan adet geçersiz' }
  }
  if (!Number.isFinite(ortalama_kg) || ortalama_kg <= 0) {
    return { error: 'Ortalama kg geçersiz' }
  }

  const { error } = await supabase.from('suru_tarti').insert({
    donem_id: donemId,
    blok_no,
    tarih,
    tartilan_adet,
    ortalama_kg,
  })
  if (error) return { error: error.message }

  await revalidateDonem(donemId)
  return { ok: true }
}

export async function updateTarti(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const tarih = String(formData.get('tarih') ?? '').trim()
  const blok_no = intOr(formData, 'blok_no')
  const tartilan_adet = Number(formData.get('tartilan_adet') ?? 0)
  const ortalama_kg = decimal(formData, 'ortalama_kg')

  if (!tarih) return { error: 'Tarih gerekli' }

  const { data, error } = await supabase
    .from('suru_tarti')
    .update({ tarih, blok_no, tartilan_adet, ortalama_kg })
    .eq('id', id)
    .select('donem_id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Güncellenemedi' }

  await revalidateDonem(data.donem_id)
  return { ok: true }
}

export async function deleteTarti(id: string) {
  const supabase = await createClient()
  const { data, error: selErr } = await supabase
    .from('suru_tarti')
    .select('donem_id')
    .eq('id', id)
    .single()
  if (selErr || !data) return { error: selErr?.message ?? 'Bulunamadı' }
  const { error } = await supabase.from('suru_tarti').delete().eq('id', id)
  if (error) return { error: error.message }
  await revalidateDonem(data.donem_id)
  return { ok: true }
}

export async function addOlum(donemId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const tarih = String(formData.get('tarih') ?? '').trim()
  const blok_no = intOr(formData, 'blok_no')
  const adet = Number(formData.get('adet') ?? 0)
  const sebep = (String(formData.get('sebep') ?? '').trim() || null) as string | null

  if (!tarih) return { error: 'Tarih gerekli' }
  if (!Number.isInteger(adet) || adet < 1) return { error: 'Adet geçersiz' }

  const { error } = await supabase.from('suru_olum').insert({
    donem_id: donemId,
    blok_no,
    tarih,
    adet,
    sebep,
  })
  if (error) return { error: error.message }

  await revalidateDonem(donemId)
  return { ok: true }
}

export async function updateOlum(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const tarih = String(formData.get('tarih') ?? '').trim()
  const blok_no = intOr(formData, 'blok_no')
  const adet = Number(formData.get('adet') ?? 0)
  const sebep = (String(formData.get('sebep') ?? '').trim() || null) as string | null

  if (!tarih) return { error: 'Tarih gerekli' }

  const { data, error } = await supabase
    .from('suru_olum')
    .update({ tarih, blok_no, adet, sebep })
    .eq('id', id)
    .select('donem_id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Güncellenemedi' }

  await revalidateDonem(data.donem_id)
  return { ok: true }
}

export async function deleteOlum(id: string) {
  const supabase = await createClient()
  const { data, error: selErr } = await supabase
    .from('suru_olum')
    .select('donem_id')
    .eq('id', id)
    .single()
  if (selErr || !data) return { error: selErr?.message ?? 'Bulunamadı' }
  const { error } = await supabase.from('suru_olum').delete().eq('id', id)
  if (error) return { error: error.message }
  await revalidateDonem(data.donem_id)
  return { ok: true }
}

export async function addYem(donemId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const tarih = String(formData.get('tarih') ?? '').trim()
  const blok_no = intOr(formData, 'blok_no')
  const yem_kg = decimal(formData, 'yem_kg')
  const yem_tipi = String(formData.get('yem_tipi') ?? '') as YemTipi

  if (!tarih) return { error: 'Tarih gerekli' }
  if (!Number.isFinite(yem_kg) || yem_kg <= 0) return { error: 'Yem kg geçersiz' }
  if (!['baslatici', 'buyutme', 'bitirici'].includes(yem_tipi)) {
    return { error: 'Yem tipi geçersiz' }
  }

  const { error } = await supabase.from('suru_yem').insert({
    donem_id: donemId,
    blok_no,
    tarih,
    yem_kg,
    yem_tipi,
  })
  if (error) return { error: error.message }

  await revalidateDonem(donemId)
  return { ok: true }
}

export async function updateYem(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const tarih = String(formData.get('tarih') ?? '').trim()
  const blok_no = intOr(formData, 'blok_no')
  const yem_kg = decimal(formData, 'yem_kg')
  const yem_tipi = String(formData.get('yem_tipi') ?? '') as YemTipi

  if (!tarih) return { error: 'Tarih gerekli' }

  const { data, error } = await supabase
    .from('suru_yem')
    .update({ tarih, blok_no, yem_kg, yem_tipi })
    .eq('id', id)
    .select('donem_id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Güncellenemedi' }

  await revalidateDonem(data.donem_id)
  return { ok: true }
}

export async function deleteYem(id: string) {
  const supabase = await createClient()
  const { data, error: selErr } = await supabase
    .from('suru_yem')
    .select('donem_id')
    .eq('id', id)
    .single()
  if (selErr || !data) return { error: selErr?.message ?? 'Bulunamadı' }
  const { error } = await supabase.from('suru_yem').delete().eq('id', id)
  if (error) return { error: error.message }
  await revalidateDonem(data.donem_id)
  return { ok: true }
}

async function revalidateDonem(donemId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('suru_donemleri')
    .select('donem_no')
    .eq('id', donemId)
    .maybeSingle()
  revalidatePath('/suru')
  revalidatePath('/')
  if (data?.donem_no) revalidatePath(`/suru/${data.donem_no}`)
}
