'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { uretTekrarVadeleri } from '@/lib/odemeler/tekrar'
import type { OdemeFiltre, OdemeInput, TekrarInput, Odeme } from '@/types/odemeler'

const ODEME_SELECT = `
  id, aciklama, kategori_id, tutar, vade_tarihi, kime, notlar,
  odendi_mi, odeme_tarihi, tekrar_grubu_id, olusturan, created_at, updated_at,
  kategori:odeme_kategorileri(id, isim, renk)
`

export async function listOdemeler(filtre: OdemeFiltre = {}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] as Odeme[] }

  let q = supabase
    .from('odemeler')
    .select(ODEME_SELECT)
    .order('odendi_mi', { ascending: true })
    .order('vade_tarihi', { ascending: true })

  if (filtre.kategori_ids && filtre.kategori_ids.length > 0) {
    q = q.in('kategori_id', filtre.kategori_ids)
  }
  if (filtre.tarih_baslangic) {
    q = q.gte('vade_tarihi', filtre.tarih_baslangic)
  }
  if (filtre.tarih_bitis) {
    q = q.lte('vade_tarihi', filtre.tarih_bitis)
  }
  if (filtre.arama) {
    const term = filtre.arama.replace(/[%_]/g, '\\$&')
    q = q.or(`aciklama.ilike.%${term}%,kime.ilike.%${term}%`)
  }

  const { data, error } = await q
  if (error) return { error: error.message, data: [] as Odeme[] }
  return { error: null, data: (data ?? []) as unknown as Odeme[] }
}

export async function listKategoriler() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('odeme_kategorileri')
    .select('id, isim, renk')
    .order('isim')
  if (error) return { error: error.message, data: [] }
  return { error: null, data: data ?? [] }
}

export async function createKategori(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const isim = String(formData.get('isim') ?? '').trim()
  const renk = String(formData.get('renk') ?? '#6366f1').trim()
  if (!isim) return { error: 'Kategori adı gerekli' }

  const { data, error } = await supabase
    .from('odeme_kategorileri')
    .insert({ isim, renk })
    .select('id, isim, renk')
    .single()
  if (error) return { error: error.message }

  revalidatePath('/odemeler')
  revalidatePath('/odemeler/takvim')
  return { ok: true, data }
}

function readOdemeInput(formData: FormData): OdemeInput | { error: string } {
  const aciklama = String(formData.get('aciklama') ?? '').trim()
  const kategori_id = (String(formData.get('kategori_id') ?? '').trim() || null) as string | null
  const tutarRaw = String(formData.get('tutar') ?? '').replace(',', '.').trim()
  const tutar = Number(tutarRaw)
  const vade_tarihi = String(formData.get('vade_tarihi') ?? '').trim()
  const kime = (String(formData.get('kime') ?? '').trim() || null) as string | null
  const notlar = (String(formData.get('notlar') ?? '').trim() || null) as string | null
  const odendi_mi = formData.get('odendi_mi') === 'on' || formData.get('odendi_mi') === 'true'
  const odeme_tarihi = (String(formData.get('odeme_tarihi') ?? '').trim() || null) as string | null

  if (!aciklama) return { error: 'Açıklama gerekli' }
  if (!Number.isFinite(tutar) || tutar < 0) return { error: 'Tutar geçersiz' }
  if (!vade_tarihi) return { error: 'Vade tarihi gerekli' }

  return {
    aciklama,
    kategori_id,
    tutar,
    vade_tarihi,
    kime,
    notlar,
    odendi_mi,
    odeme_tarihi: odendi_mi ? odeme_tarihi ?? new Date().toISOString().slice(0, 10) : null,
  }
}

export async function createOdeme(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readOdemeInput(formData)
  if ('error' in parsed) return parsed

  const { error } = await supabase.from('odemeler').insert({
    ...parsed,
    olusturan: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/odemeler')
  revalidatePath('/odemeler/takvim')
  revalidatePath('/')
  return { ok: true }
}

export async function updateOdeme(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readOdemeInput(formData)
  if ('error' in parsed) return parsed

  const { error } = await supabase
    .from('odemeler')
    .update({
      ...parsed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/odemeler')
  revalidatePath('/odemeler/takvim')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteOdeme(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { error } = await supabase.from('odemeler').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/odemeler')
  revalidatePath('/odemeler/takvim')
  revalidatePath('/')
  return { ok: true }
}

export async function markPaid(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('odemeler')
    .update({
      odendi_mi: true,
      odeme_tarihi: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/odemeler')
  revalidatePath('/odemeler/takvim')
  revalidatePath('/')
  return { ok: true }
}

export async function createTekrarGrubu(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const baslik = String(formData.get('baslik') ?? '').trim()
  const periyot = String(formData.get('periyot') ?? '') as TekrarInput['periyot']
  const tekrar_sayisi = Number(formData.get('tekrar_sayisi') ?? 0)

  const parsed = readOdemeInput(formData)
  if ('error' in parsed) return parsed
  if (!baslik) return { error: 'Grup başlığı gerekli' }
  if (!['haftalik', 'aylik', 'yillik'].includes(periyot)) {
    return { error: 'Periyot geçersiz' }
  }
  if (!Number.isInteger(tekrar_sayisi) || tekrar_sayisi < 1 || tekrar_sayisi > 60) {
    return { error: 'Tekrar sayısı 1–60 arasında olmalı' }
  }

  // Tekrar grubu oluştur
  const { data: grup, error: grupErr } = await supabase
    .from('odeme_tekrar_gruplari')
    .insert({
      baslik,
      periyot,
      tekrar_sayisi,
      olusturan: user.id,
    })
    .select('id')
    .single()
  if (grupErr || !grup) return { error: grupErr?.message ?? 'Grup oluşturulamadı' }

  // N adet odeme satırı üret
  const vadeler = uretTekrarVadeleri(parsed.vade_tarihi, periyot, tekrar_sayisi)
  const rows = vadeler.map((vade) => ({
    aciklama: parsed.aciklama,
    kategori_id: parsed.kategori_id,
    tutar: parsed.tutar,
    vade_tarihi: vade,
    kime: parsed.kime,
    notlar: parsed.notlar,
    odendi_mi: false,
    odeme_tarihi: null,
    tekrar_grubu_id: grup.id,
    olusturan: user.id,
  }))

  const { error: insErr } = await supabase.from('odemeler').insert(rows)
  if (insErr) {
    // rollback grup
    await supabase.from('odeme_tekrar_gruplari').delete().eq('id', grup.id)
    return { error: insErr.message }
  }

  revalidatePath('/odemeler')
  revalidatePath('/odemeler/takvim')
  revalidatePath('/')
  return { ok: true, sayisi: rows.length }
}
