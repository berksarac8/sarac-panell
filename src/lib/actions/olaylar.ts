'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OlayFiltre, CiftlikOlay, SuruDonemRef } from '@/types/olaylar'

const OLAY_SELECT = `
  id, tarih, kategori_id, baslik, aciklama, kisi_firma, donem_id,
  olusturan, created_at, updated_at,
  kategori:olay_kategorileri(id, isim, renk),
  donem:suru_donemleri(id, donem_no, durum)
`

export async function listOlaylar(filtre: OlayFiltre = {}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] as CiftlikOlay[] }

  let q = supabase
    .from('ciftlik_olaylari')
    .select(OLAY_SELECT)
    .order('tarih', { ascending: false })
    .order('created_at', { ascending: false })

  if (filtre.kategori_ids && filtre.kategori_ids.length > 0) {
    q = q.in('kategori_id', filtre.kategori_ids)
  }
  if (filtre.tarih_baslangic) {
    q = q.gte('tarih', filtre.tarih_baslangic)
  }
  if (filtre.tarih_bitis) {
    q = q.lte('tarih', filtre.tarih_bitis)
  }
  if (filtre.donem_id) {
    q = q.eq('donem_id', filtre.donem_id)
  }
  if (filtre.arama) {
    const term = filtre.arama.replace(/[%_]/g, '\\$&')
    q = q.or(`baslik.ilike.%${term}%,aciklama.ilike.%${term}%,kisi_firma.ilike.%${term}%`)
  }

  const { data, error } = await q
  if (error) return { error: error.message, data: [] as CiftlikOlay[] }
  return { error: null, data: (data ?? []) as unknown as CiftlikOlay[] }
}

export async function listOlayKategorileri() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('olay_kategorileri')
    .select('id, isim, renk')
    .order('isim')
  if (error) return { error: error.message, data: [] }
  return { error: null, data: data ?? [] }
}

export async function createOlayKategori(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const isim = String(formData.get('isim') ?? '').trim()
  const renk = String(formData.get('renk') ?? '#6366f1').trim()
  if (!isim) return { error: 'Kategori adı gerekli' }

  const { data, error } = await supabase
    .from('olay_kategorileri')
    .insert({ isim, renk })
    .select('id, isim, renk')
    .single()
  if (error) return { error: error.message }

  revalidatePath('/olaylar')
  return { ok: true, data }
}

export async function getActiveSuruDonem(): Promise<{
  error: string | null
  data: SuruDonemRef | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suru_donemleri')
    .select('id, donem_no, durum')
    .eq('durum', 'aktif')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { error: error.message, data: null }
  return { error: null, data: (data as SuruDonemRef | null) ?? null }
}

export async function listSuruDonemleri(): Promise<{
  error: string | null
  data: SuruDonemRef[]
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suru_donemleri')
    .select('id, donem_no, durum')
    .order('created_at', { ascending: false })
  if (error) return { error: error.message, data: [] }
  return { error: null, data: (data ?? []) as SuruDonemRef[] }
}

function readOlayInput(formData: FormData):
  | {
      tarih: string
      kategori_id: string | null
      baslik: string
      aciklama: string | null
      kisi_firma: string | null
      donem_id: string | null
    }
  | { error: string } {
  const tarih = String(formData.get('tarih') ?? '').trim()
  const kategori_id = (String(formData.get('kategori_id') ?? '').trim() || null) as string | null
  const baslik = String(formData.get('baslik') ?? '').trim()
  const aciklama = (String(formData.get('aciklama') ?? '').trim() || null) as string | null
  const kisi_firma = (String(formData.get('kisi_firma') ?? '').trim() || null) as string | null
  const donemRaw = String(formData.get('donem_id') ?? '').trim()
  const donem_id = donemRaw === '' || donemRaw === '__none__' ? null : donemRaw

  if (!tarih) return { error: 'Tarih gerekli' }
  if (!baslik) return { error: 'Başlık gerekli' }

  return { tarih, kategori_id, baslik, aciklama, kisi_firma, donem_id }
}

export async function createOlay(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readOlayInput(formData)
  if ('error' in parsed) return parsed

  const { error } = await supabase.from('ciftlik_olaylari').insert({
    ...parsed,
    olusturan: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/olaylar')
  revalidatePath('/')
  return { ok: true }
}

export async function updateOlay(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readOlayInput(formData)
  if ('error' in parsed) return parsed

  const { error } = await supabase
    .from('ciftlik_olaylari')
    .update({
      ...parsed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/olaylar')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteOlay(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { error } = await supabase.from('ciftlik_olaylari').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/olaylar')
  revalidatePath('/')
  return { ok: true }
}
