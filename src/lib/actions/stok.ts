'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  StokKalem,
  StokKalemOzet,
  StokHareket,
  StokHareketFiltre,
  StokKategori,
  StokBirim,
  HareketTipi,
  SuruDonemRef,
} from '@/types/stok'

const HAREKET_SELECT = `
  id, kalem_id, hareket_tipi, miktar, birim_fiyat, tedarikci,
  tarih, donem_id, notlar, olusturan, created_at,
  kalem:stok_kalemler(id, isim, birim),
  donem:suru_donemleri(id, donem_no, durum)
`

const KATEGORILER: ReadonlyArray<StokKategori> = ['yem', 'ilac', 'malzeme', 'diger']
const BIRIMLER: ReadonlyArray<StokBirim> = ['kg', 'litre', 'adet', 'paket']

export async function listStokKalemler(): Promise<{
  error: string | null
  data: StokKalemOzet[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  const { data: kalemler, error: kalemErr } = await supabase
    .from('stok_kalemler')
    .select('id, isim, kategori, birim, notlar, created_at')
    .order('isim')
  if (kalemErr) return { error: kalemErr.message, data: [] }

  const { data: hareketler, error: hareketErr } = await supabase
    .from('stok_hareketler')
    .select('kalem_id, hareket_tipi, miktar')
  if (hareketErr) return { error: hareketErr.message, data: [] }

  const tally = new Map<string, { giris: number; cikis: number }>()
  for (const h of hareketler ?? []) {
    const row = h as { kalem_id: string; hareket_tipi: HareketTipi; miktar: number | string }
    const acc = tally.get(row.kalem_id) ?? { giris: 0, cikis: 0 }
    const miktar = Number(row.miktar)
    if (row.hareket_tipi === 'giris') acc.giris += miktar
    else acc.cikis += miktar
    tally.set(row.kalem_id, acc)
  }

  const ozetli: StokKalemOzet[] = ((kalemler ?? []) as unknown as StokKalem[]).map((k) => {
    const t = tally.get(k.id) ?? { giris: 0, cikis: 0 }
    return {
      ...k,
      toplam_giris: t.giris,
      toplam_cikis: t.cikis,
      mevcut: t.giris - t.cikis,
    }
  })

  return { error: null, data: ozetli }
}

export async function listStokHareketler(filtre: StokHareketFiltre = {}): Promise<{
  error: string | null
  data: StokHareket[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  let q = supabase
    .from('stok_hareketler')
    .select(HAREKET_SELECT)
    .order('tarih', { ascending: false })
    .order('created_at', { ascending: false })

  if (filtre.kalem_id) q = q.eq('kalem_id', filtre.kalem_id)
  if (filtre.donem_id) q = q.eq('donem_id', filtre.donem_id)
  if (filtre.hareket_tipi) q = q.eq('hareket_tipi', filtre.hareket_tipi)
  if (filtre.tarih_baslangic) q = q.gte('tarih', filtre.tarih_baslangic)
  if (filtre.tarih_bitis) q = q.lte('tarih', filtre.tarih_bitis)

  const { data, error } = await q
  if (error) return { error: error.message, data: [] }
  return { error: null, data: (data ?? []) as unknown as StokHareket[] }
}

export async function listSuruDonemleriRef(): Promise<{
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

function readKalemInput(formData: FormData):
  | {
      isim: string
      kategori: StokKategori
      birim: StokBirim
      notlar: string | null
    }
  | { error: string } {
  const isim = String(formData.get('isim') ?? '').trim()
  const kategoriRaw = String(formData.get('kategori') ?? '').trim()
  const birimRaw = String(formData.get('birim') ?? '').trim()
  const notlar = (String(formData.get('notlar') ?? '').trim() || null) as string | null

  if (!isim) return { error: 'İsim gerekli' }
  if (!KATEGORILER.includes(kategoriRaw as StokKategori)) return { error: 'Kategori geçersiz' }
  if (!BIRIMLER.includes(birimRaw as StokBirim)) return { error: 'Birim geçersiz' }

  return {
    isim,
    kategori: kategoriRaw as StokKategori,
    birim: birimRaw as StokBirim,
    notlar,
  }
}

export async function createStokKalem(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readKalemInput(formData)
  if ('error' in parsed) return parsed

  const { data, error } = await supabase
    .from('stok_kalemler')
    .insert(parsed)
    .select('id, isim, kategori, birim, notlar, created_at')
    .single()
  if (error) return { error: error.message }

  revalidatePath('/stok')
  return { ok: true, data: data as StokKalem }
}

export async function updateStokKalem(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readKalemInput(formData)
  if ('error' in parsed) return parsed

  const { error } = await supabase.from('stok_kalemler').update(parsed).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/stok')
  return { ok: true }
}

export async function deleteStokKalem(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  // Bağlı hareket var mı?
  const { count, error: countErr } = await supabase
    .from('stok_hareketler')
    .select('id', { count: 'exact', head: true })
    .eq('kalem_id', id)
  if (countErr) return { error: countErr.message }
  if ((count ?? 0) > 0) {
    return { error: `Bu kaleme ${count} hareket bağlı, önce hareketleri silin.` }
  }

  const { error } = await supabase.from('stok_kalemler').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/stok')
  return { ok: true }
}

function readHareketInput(formData: FormData):
  | {
      kalem_id: string
      hareket_tipi: HareketTipi
      miktar: number
      birim_fiyat: number | null
      tedarikci: string | null
      tarih: string
      donem_id: string | null
      notlar: string | null
    }
  | { error: string } {
  const kalem_id = String(formData.get('kalem_id') ?? '').trim()
  const tipRaw = String(formData.get('hareket_tipi') ?? '').trim()
  const miktarRaw = String(formData.get('miktar') ?? '').replace(',', '.').trim()
  const miktar = Number(miktarRaw)
  const fiyatRaw = String(formData.get('birim_fiyat') ?? '').replace(',', '.').trim()
  const birim_fiyat = fiyatRaw === '' ? null : Number(fiyatRaw)
  const tedarikci = (String(formData.get('tedarikci') ?? '').trim() || null) as string | null
  const tarih = String(formData.get('tarih') ?? '').trim()
  const donemRaw = String(formData.get('donem_id') ?? '').trim()
  const donem_id = donemRaw === '' || donemRaw === '__none__' ? null : donemRaw
  const notlar = (String(formData.get('notlar') ?? '').trim() || null) as string | null

  if (!kalem_id) return { error: 'Kalem seçin' }
  if (tipRaw !== 'giris' && tipRaw !== 'cikis') return { error: 'Hareket tipi geçersiz' }
  if (!Number.isFinite(miktar) || miktar <= 0) return { error: 'Miktar pozitif olmalı' }
  if (birim_fiyat !== null && (!Number.isFinite(birim_fiyat) || birim_fiyat < 0)) {
    return { error: 'Birim fiyat geçersiz' }
  }
  if (!tarih) return { error: 'Tarih gerekli' }

  return {
    kalem_id,
    hareket_tipi: tipRaw as HareketTipi,
    miktar,
    birim_fiyat,
    tedarikci,
    tarih,
    donem_id,
    notlar,
  }
}

export async function createStokHareket(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readHareketInput(formData)
  if ('error' in parsed) return parsed

  const { error } = await supabase
    .from('stok_hareketler')
    .insert({ ...parsed, olusturan: user.id })
  if (error) return { error: error.message }

  revalidatePath('/stok')
  return { ok: true }
}

export async function updateStokHareket(id: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const parsed = readHareketInput(formData)
  if ('error' in parsed) return parsed

  const { error } = await supabase.from('stok_hareketler').update(parsed).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/stok')
  return { ok: true }
}

export async function deleteStokHareket(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz' }

  const { error } = await supabase.from('stok_hareketler').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/stok')
  return { ok: true }
}
