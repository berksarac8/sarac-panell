'use server'

import { createClient } from '@/lib/supabase/server'

export type AramaSonucTip = 'odeme' | 'olay' | 'suru'

export type AramaSonuc = {
  tip: AramaSonucTip
  id: string
  baslik: string
  link: string
  ek_bilgi: string | null
}

/**
 * Global arama: ödemeler + olaylar + sürüler.
 * Her tip için max 5, toplam max 15 sonuç.
 */
export async function globalArama(q: string): Promise<{
  error: string | null
  data: AramaSonuc[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz', data: [] }

  const term = q.trim()
  if (!term || term.length < 2) {
    return { error: null, data: [] }
  }

  // ILIKE için %_ kaçışı
  const escaped = term.replace(/[%_]/g, '\\$&')
  const like = `%${escaped}%`

  const [odemelerRes, olaylarRes, surulerRes] = await Promise.all([
    supabase
      .from('odemeler')
      .select('id, aciklama, kime, vade_tarihi, tutar, odendi_mi')
      .or(`aciklama.ilike.${like},kime.ilike.${like}`)
      .order('vade_tarihi', { ascending: false })
      .limit(5),
    supabase
      .from('ciftlik_olaylari')
      .select('id, baslik, aciklama, tarih')
      .or(`baslik.ilike.${like},aciklama.ilike.${like}`)
      .order('tarih', { ascending: false })
      .limit(5),
    supabase
      .from('suru_donemleri')
      .select('id, donem_no, giris_tarihi, durum, notlar')
      .or(`donem_no.ilike.${like},notlar.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const sonuclar: AramaSonuc[] = []

  if (!odemelerRes.error) {
    for (const o of (odemelerRes.data ?? []) as Array<{
      id: string
      aciklama: string
      kime: string | null
      vade_tarihi: string
      tutar: number
      odendi_mi: boolean
    }>) {
      const tutarStr = Number(o.tutar).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      sonuclar.push({
        tip: 'odeme',
        id: o.id,
        baslik: o.aciklama,
        link: '/odemeler',
        ek_bilgi: `${o.vade_tarihi} • ${tutarStr} ₺${o.kime ? ' • ' + o.kime : ''}${o.odendi_mi ? ' • Ödendi' : ''}`,
      })
    }
  }

  if (!olaylarRes.error) {
    for (const ol of (olaylarRes.data ?? []) as Array<{
      id: string
      baslik: string
      aciklama: string | null
      tarih: string
    }>) {
      sonuclar.push({
        tip: 'olay',
        id: ol.id,
        baslik: ol.baslik,
        link: '/olaylar',
        ek_bilgi: `${ol.tarih}${ol.aciklama ? ' • ' + ol.aciklama.slice(0, 60) : ''}`,
      })
    }
  }

  if (!surulerRes.error) {
    for (const s of (surulerRes.data ?? []) as Array<{
      id: string
      donem_no: string
      giris_tarihi: string
      durum: 'aktif' | 'kapali'
      notlar: string | null
    }>) {
      sonuclar.push({
        tip: 'suru',
        id: s.id,
        baslik: `Dönem ${s.donem_no}`,
        link: `/suru/${s.donem_no}`,
        ek_bilgi: `Giriş: ${s.giris_tarihi} • ${s.durum === 'aktif' ? 'Aktif' : 'Kapalı'}${s.notlar ? ' • ' + s.notlar.slice(0, 50) : ''}`,
      })
    }
  }

  // Toplam max 15
  return { error: null, data: sonuclar.slice(0, 15) }
}
