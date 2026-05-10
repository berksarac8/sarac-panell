'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  isOdemeSistemKategori,
  isOlaySistemKategori,
} from '@/lib/ayarlar/sistem-kategorileri'
import type { ProfilOzet, KategoriDetay } from '@/types/ayarlar'

// ============================================================================
// Profil
// ============================================================================

export async function getProfilOzet(): Promise<{
  error: string | null
  data: ProfilOzet | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, ad_soyad, rol')
    .eq('id', user.id)
    .single()
  if (error) return { error: error.message, data: null }

  return {
    error: null,
    data: {
      id: data.id,
      email: user.email ?? '',
      ad_soyad: data.ad_soyad,
      rol: data.rol,
    },
  }
}

export async function updateProfilAdSoyad(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const adSoyad = String(formData.get('ad_soyad') ?? '').trim()
  if (!adSoyad) return { error: 'Ad Soyad boş olamaz' }
  if (adSoyad.length < 2) return { error: 'Ad Soyad en az 2 karakter' }

  const { error } = await supabase
    .from('profiles')
    .update({ ad_soyad: adSoyad })
    .eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/')
  return { ok: true }
}

// ============================================================================
// Kategori CRUD — Ödeme
// ============================================================================

export async function listOdemeKategorileriDetay(): Promise<{
  error: string | null
  data: KategoriDetay[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  const { data: kats, error } = await supabase
    .from('odeme_kategorileri')
    .select('id, isim, renk')
    .order('isim')
  if (error) return { error: error.message, data: [] }

  // bağlı kayıt sayıları — tek seferde alalım
  const ids = (kats ?? []).map((k) => k.id)
  const sayilar = new Map<string, number>()
  if (ids.length) {
    const { data: counts } = await supabase
      .from('odemeler')
      .select('kategori_id')
      .in('kategori_id', ids)
    for (const row of counts ?? []) {
      const kid = (row as { kategori_id: string | null }).kategori_id
      if (!kid) continue
      sayilar.set(kid, (sayilar.get(kid) ?? 0) + 1)
    }
  }

  return {
    error: null,
    data: (kats ?? []).map((k) => ({
      ...k,
      sistem: isOdemeSistemKategori(k.isim),
      baglı_kayit_sayisi: sayilar.get(k.id) ?? 0,
    })),
  }
}

export async function listOlayKategorileriDetay(): Promise<{
  error: string | null
  data: KategoriDetay[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  const { data: kats, error } = await supabase
    .from('olay_kategorileri')
    .select('id, isim, renk')
    .order('isim')
  if (error) return { error: error.message, data: [] }

  const ids = (kats ?? []).map((k) => k.id)
  const sayilar = new Map<string, number>()
  if (ids.length) {
    const { data: counts } = await supabase
      .from('ciftlik_olaylari')
      .select('kategori_id')
      .in('kategori_id', ids)
    for (const row of counts ?? []) {
      const kid = (row as { kategori_id: string | null }).kategori_id
      if (!kid) continue
      sayilar.set(kid, (sayilar.get(kid) ?? 0) + 1)
    }
  }

  return {
    error: null,
    data: (kats ?? []).map((k) => ({
      ...k,
      sistem: isOlaySistemKategori(k.isim),
      baglı_kayit_sayisi: sayilar.get(k.id) ?? 0,
    })),
  }
}

export async function createOdemeKategoriAyar(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const isim = String(formData.get('isim') ?? '').trim()
  const renk = String(formData.get('renk') ?? '#6366f1').trim()
  if (!isim) return { error: 'Kategori adı gerekli' }

  const { error } = await supabase.from('odeme_kategorileri').insert({ isim, renk })
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/odemeler')
  return { ok: true }
}

export async function updateOdemeKategoriAyar(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const isim = String(formData.get('isim') ?? '').trim()
  const renk = String(formData.get('renk') ?? '#6366f1').trim()
  if (!isim) return { error: 'Kategori adı gerekli' }

  // Sistem kategorisinin ismini değiştirme yasak (renk OK)
  const { data: mevcut, error: getErr } = await supabase
    .from('odeme_kategorileri')
    .select('isim')
    .eq('id', id)
    .single()
  if (getErr) return { error: getErr.message }
  if (mevcut && isOdemeSistemKategori(mevcut.isim) && mevcut.isim !== isim) {
    return { error: 'Sistem kategorisinin adı değiştirilemez (rengi değiştirebilirsin).' }
  }

  const { error } = await supabase
    .from('odeme_kategorileri')
    .update({ isim, renk })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/odemeler')
  return { ok: true }
}

export async function deleteOdemeKategoriAyar(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { data: kat, error: getErr } = await supabase
    .from('odeme_kategorileri')
    .select('isim')
    .eq('id', id)
    .single()
  if (getErr) return { error: getErr.message }
  if (kat && isOdemeSistemKategori(kat.isim)) {
    return { error: 'Bu kategori sistemde tanımlı, silinemez.' }
  }

  // bağlı kayıt kontrolü
  const { count } = await supabase
    .from('odemeler')
    .select('id', { count: 'exact', head: true })
    .eq('kategori_id', id)
  if ((count ?? 0) > 0) {
    return { error: `Bu kategoriye ${count} ödeme bağlı, önce kayıtların kategorisini değiştirin.` }
  }

  const { error } = await supabase.from('odeme_kategorileri').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/odemeler')
  return { ok: true }
}

export async function createOlayKategoriAyar(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const isim = String(formData.get('isim') ?? '').trim()
  const renk = String(formData.get('renk') ?? '#6366f1').trim()
  if (!isim) return { error: 'Kategori adı gerekli' }

  const { error } = await supabase.from('olay_kategorileri').insert({ isim, renk })
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/olaylar')
  return { ok: true }
}

export async function updateOlayKategoriAyar(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const isim = String(formData.get('isim') ?? '').trim()
  const renk = String(formData.get('renk') ?? '#6366f1').trim()
  if (!isim) return { error: 'Kategori adı gerekli' }

  const { data: mevcut, error: getErr } = await supabase
    .from('olay_kategorileri')
    .select('isim')
    .eq('id', id)
    .single()
  if (getErr) return { error: getErr.message }
  if (mevcut && isOlaySistemKategori(mevcut.isim) && mevcut.isim !== isim) {
    return { error: 'Sistem kategorisinin adı değiştirilemez (rengi değiştirebilirsin).' }
  }

  const { error } = await supabase
    .from('olay_kategorileri')
    .update({ isim, renk })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/olaylar')
  return { ok: true }
}

export async function deleteOlayKategoriAyar(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { data: kat, error: getErr } = await supabase
    .from('olay_kategorileri')
    .select('isim')
    .eq('id', id)
    .single()
  if (getErr) return { error: getErr.message }
  if (kat && isOlaySistemKategori(kat.isim)) {
    return { error: 'Bu kategori sistemde tanımlı, silinemez.' }
  }

  const { count } = await supabase
    .from('ciftlik_olaylari')
    .select('id', { count: 'exact', head: true })
    .eq('kategori_id', id)
  if ((count ?? 0) > 0) {
    return { error: `Bu kategoriye ${count} olay bağlı, önce kayıtların kategorisini değiştirin.` }
  }

  const { error } = await supabase.from('olay_kategorileri').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/olaylar')
  return { ok: true }
}
