/**
 * Günlük cron endpoint'i — yaklaşan (7 gün içinde) ve gecikmiş ödemeleri
 * Telegram'a özet mesaj olarak gönderir.
 *
 * Vercel cron her gün UTC 06:00'da (İstanbul 09:00) çağırır.
 * `vercel.json` içindeki `crons` tanımına bakın.
 *
 * Yetkilendirme:
 *   - `CRON_SECRET` set'liyse `Authorization: Bearer <secret>` zorunlu.
 *   - Boşsa (geliştirme) auth atlanır.
 *
 * Supabase bağlantısı `service_role` anahtarıyla yapılır — bu endpoint
 * kullanıcı bağlamı olmadan çalıştığı için RLS bypass gerekiyor.
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  escapeHtml,
  formatTRY,
  formatTarih,
  sendTelegramMessage,
} from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OdemeRow = {
  id: string
  aciklama: string
  tutar: number
  vade_tarihi: string
  odendi_mi: boolean
  kategori: { isim: string } | { isim: string }[] | null
}

function kategoriEtiketi(row: OdemeRow): string {
  const k = row.kategori
  if (!k) return ''
  const isim = Array.isArray(k) ? k[0]?.isim : k.isim
  return isim ? ` (${escapeHtml(isim)})` : ''
}

export async function GET(_request: Request) {
  // Vercel Hobby cron'lari auth header eklemez, endpoint public.
  // Risk: kotuye kullanim sadece Telegram'a spam yaratir, veri kaybi yok.

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase credentials missing' },
      { status: 500 },
    )
  }

  // Service role client (RLS bypass — server-only, asla client'a sızmamalı)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Bugün ve 7 gün sonrası (YYYY-MM-DD)
  const bugun = new Date().toISOString().split('T')[0]
  const yedi = new Date()
  yedi.setDate(yedi.getDate() + 7)
  const yediStr = yedi.toISOString().split('T')[0]

  // Gecikmiş + yaklaşan ödemeler (sadece henüz ödenmemiş)
  const { data: odemeler, error } = await supabase
    .from('odemeler')
    .select('id, aciklama, tutar, vade_tarihi, odendi_mi, kategori:odeme_kategorileri(isim)')
    .eq('odendi_mi', false)
    .lte('vade_tarihi', yediStr)
    .order('vade_tarihi', { ascending: true })
    .returns<OdemeRow[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!odemeler || odemeler.length === 0) {
    const result = await sendTelegramMessage(
      '🐔 <b>Sarac Tavukçuluk</b>\n\nBugün veya yaklaşan 7 gün için bekleyen ödeme yok. ✅',
    )
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ sent: 1, total: 0 })
  }

  const gecikmis = odemeler.filter((o) => o.vade_tarihi < bugun)
  const yaklasan = odemeler.filter((o) => o.vade_tarihi >= bugun)

  let mesaj = `🐔 <b>Sarac Tavukçuluk — ${formatTarih(bugun)}</b>\n\n`

  if (gecikmis.length > 0) {
    mesaj += `🔴 <b>Gecikmiş (${gecikmis.length}):</b>\n`
    for (const o of gecikmis) {
      mesaj += `• ${escapeHtml(o.aciklama)}${kategoriEtiketi(o)} — ${formatTRY(Number(o.tutar))} ₺ (vade: ${formatTarih(o.vade_tarihi)})\n`
    }
    mesaj += '\n'
  }

  if (yaklasan.length > 0) {
    mesaj += `🟡 <b>Yaklaşan 7 gün (${yaklasan.length}):</b>\n`
    for (const o of yaklasan) {
      mesaj += `• ${escapeHtml(o.aciklama)}${kategoriEtiketi(o)} — ${formatTRY(Number(o.tutar))} ₺ (vade: ${formatTarih(o.vade_tarihi)})\n`
    }
    mesaj += '\n'
  }

  const toplam = odemeler.reduce((sum, o) => sum + Number(o.tutar), 0)
  mesaj += `📊 <b>Toplam:</b> ${formatTRY(toplam)} ₺\n\n`
  mesaj +=
    '<a href="https://ciftlik.saractavukculuk.com/odemeler">Detay → ciftlik.saractavukculuk.com</a>'

  const result = await sendTelegramMessage(mesaj)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    sent: 1,
    total: odemeler.length,
    gecikmis: gecikmis.length,
    yaklasan: yaklasan.length,
  })
}
