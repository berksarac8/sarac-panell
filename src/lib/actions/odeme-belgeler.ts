'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OdemeBelge } from '@/types/odemeler'

const MAX_BOYUT = 10 * 1024 * 1024 // 10MB
const STORAGE_BUCKET = 'belgeler'

/**
 * Belirli bir ödemenin tüm belgelerini döner (en yeni önce).
 */
export async function listOdemeBelgeleri(odemeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] as OdemeBelge[] }

  const { data, error } = await supabase
    .from('odeme_belgeler')
    .select('id, odeme_id, dosya_adi, storage_path, mime_type, boyut, yukleyen, created_at')
    .eq('odeme_id', odemeId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] as OdemeBelge[] }
  return { error: null, data: (data ?? []) as OdemeBelge[] }
}

/**
 * Her ödeme için kaç belge ekli olduğunu döner (Liste'deki 📎 ikonu için).
 * Map<odemeId, sayi>
 */
export async function getBelgeSayilari(odemeIds: string[]) {
  if (odemeIds.length === 0) return { error: null, data: {} as Record<string, number> }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: {} as Record<string, number> }

  const { data, error } = await supabase
    .from('odeme_belgeler')
    .select('odeme_id')
    .in('odeme_id', odemeIds)

  if (error) return { error: error.message, data: {} as Record<string, number> }
  const sayi: Record<string, number> = {}
  for (const row of data ?? []) {
    sayi[row.odeme_id] = (sayi[row.odeme_id] ?? 0) + 1
  }
  return { error: null, data: sayi }
}

/**
 * FormData içinden `odeme_id` ve `dosya` (File) ile belge yükler.
 * - 10MB sınır
 * - Storage path: odemeler/{odeme_id}/{timestamp}-{rastgele}-{guvenli_dosya_adi}
 */
export async function uploadOdemeBelge(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const odemeId = String(formData.get('odeme_id') ?? '').trim()
  if (!odemeId) return { error: 'Ödeme ID gerekli' }

  const file = formData.get('dosya')
  if (!(file instanceof File)) return { error: 'Dosya bulunamadı' }
  if (file.size === 0) return { error: 'Boş dosya' }
  if (file.size > MAX_BOYUT) return { error: 'Dosya 10MB sınırını aşıyor' }

  // Güvenli dosya adı: alfanumerik + nokta + tire + alt çizgi
  const guvenliAd = file.name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120)
  const benzersiz = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const storagePath = `odemeler/${odemeId}/${benzersiz}-${guvenliAd}`

  // Storage'a yükle
  const buffer = await file.arrayBuffer()
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (upErr) return { error: `Yükleme hatası: ${upErr.message}` }

  // DB'ye kayıt
  const { error: dbErr } = await supabase.from('odeme_belgeler').insert({
    odeme_id: odemeId,
    dosya_adi: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    boyut: file.size,
    yukleyen: user.id,
  })
  if (dbErr) {
    // rollback storage
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
    return { error: `Kayıt hatası: ${dbErr.message}` }
  }

  revalidatePath('/odemeler')
  return { ok: true }
}

/**
 * Belgeyi siler (önce DB, sonra storage). DB silinemese de storage'ı bırak (manuel temizlik).
 */
export async function deleteOdemeBelge(belgeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { data: belge, error: fetchErr } = await supabase
    .from('odeme_belgeler')
    .select('storage_path')
    .eq('id', belgeId)
    .single()
  if (fetchErr || !belge) return { error: fetchErr?.message ?? 'Belge bulunamadı' }

  const { error: delErr } = await supabase
    .from('odeme_belgeler')
    .delete()
    .eq('id', belgeId)
  if (delErr) return { error: delErr.message }

  // Storage'tan da sil (hata olsa bile DB silindi, sessizce geç)
  await supabase.storage.from(STORAGE_BUCKET).remove([belge.storage_path])

  revalidatePath('/odemeler')
  return { ok: true }
}

/**
 * Belgeyi indirmek için kısa ömürlü imzalı URL üretir (60 saniye).
 */
export async function getBelgeIndirmeUrl(belgeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { data: belge, error: fetchErr } = await supabase
    .from('odeme_belgeler')
    .select('storage_path, dosya_adi')
    .eq('id', belgeId)
    .single()
  if (fetchErr || !belge) return { error: fetchErr?.message ?? 'Belge bulunamadı' }

  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(belge.storage_path, 60, {
      download: belge.dosya_adi,
    })
  if (signErr || !signed) return { error: signErr?.message ?? 'URL üretilemedi' }

  return { ok: true, url: signed.signedUrl }
}
