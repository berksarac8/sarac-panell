/**
 * Telegram Bot API helper'ları.
 *
 * `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` env var'ları üzerinden bot
 * kimliği taşınır. Mesajlar HTML parse_mode ile gönderilir; bu yüzden
 * kullanıcı verisi içeren metinler `escapeHtml` ile sanitize edilmelidir.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot'

export type TelegramResult = { ok: true } | { ok: false; error: string }

export async function sendTelegramMessage(
  text: string,
  chatId?: string,
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const targetChatId = chatId ?? process.env.TELEGRAM_CHAT_ID

  if (!token || !targetChatId) {
    return { ok: false, error: 'Telegram credentials missing' }
  }

  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    const data = (await res.json()) as { ok: boolean; description?: string }
    if (!data.ok) {
      return { ok: false, error: data.description ?? 'Unknown error' }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Network error',
    }
  }
}

/** Türk Lirası formatı: 12345.6 → "12.345,60" */
export function formatTRY(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** ISO 'YYYY-MM-DD' → "10 Mayıs" gibi okunabilir biçim. */
export function formatTarih(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })
}

/**
 * HTML parse_mode kullandığımız için kullanıcı kaynaklı string'ler
 * mutlaka sanitize edilmeli. Telegram yalnızca `&`, `<`, `>` karakterlerini
 * çevirmeyi gerektirir.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
