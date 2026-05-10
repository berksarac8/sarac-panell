import { test, expect } from '@playwright/test'

/**
 * Smoke testi — gerçek Supabase'e bağlanır.
 *
 * Çalışması için .env.local'de TEST_USER_EMAIL ve TEST_USER_PASSWORD
 * tanımlı olmalı. Yoksa test skip edilir.
 *
 * Test kullanıcısı oluşturma (Supabase dashboard'tan):
 * 1. Authentication → Users → Add user
 * 2. E-posta + güçlü şifre belirle, "Auto Confirm User" işaretli
 * 3. profiles tablosuna ad_soyad insert et (RLS'ye dikkat — service role'dan)
 * 4. .env.local'e TEST_USER_EMAIL=... ve TEST_USER_PASSWORD=... ekle
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD
const SKIP_REASON = 'TEST_USER_EMAIL/TEST_USER_PASSWORD .env.local içinde tanımlı değil'

test.describe('Smoke: giriş + dashboard + ödeme oluştur', () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    SKIP_REASON
  )

  test('login → dashboard → +Ödeme → liste → çıkış', async ({ page }) => {
    // 1) Giriş
    await page.goto('/giris')
    await expect(page.getByRole('heading', { name: /Sarac/i })).toBeVisible()
    await page.getByLabel('E-posta').fill(TEST_EMAIL!)
    await page.getByLabel('Şifre').fill(TEST_PASSWORD!)
    await page.getByRole('button', { name: /Giriş yap/i }).click()

    // 2) Dashboard görünür
    await page.waitForURL((url) => !url.pathname.startsWith('/giris'), {
      timeout: 10_000,
    })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Yaklaşan & Gecikmiş Ödemeler/i)).toBeVisible()

    // 3) "+Ödeme" tıkla → dialog açılır
    await page.getByRole('button', { name: /^\+\s*Ödeme$/i }).click()
    await expect(page.getByRole('heading', { name: /Yeni Ödeme/i })).toBeVisible()

    // 4) Form doldur, kaydet
    const aciklama = `Smoke test ödeme ${Date.now()}`
    await page.getByLabel('Açıklama').fill(aciklama)
    await page.getByLabel('Tutar').fill('123.45')
    // Vade tarihi otomatik bugün; bırak
    await page.getByRole('button', { name: /^Kaydet$/i }).click()

    // 5) Dialog kapandı + ödemeler listesinde görünür mü?
    await expect(page.getByRole('heading', { name: /Yeni Ödeme/i })).toBeHidden({
      timeout: 10_000,
    })

    await page.goto('/odemeler')
    await expect(page.getByText(aciklama)).toBeVisible({ timeout: 10_000 })

    // 6) Çıkış (sidebar'dan veya doğrudan endpoint)
    // Esnek: çıkış UI'sı yoksa bu adım atlanır
    const cikisBtn = page.getByRole('button', { name: /(Çıkış|Logout)/i })
    if (await cikisBtn.count()) {
      await cikisBtn.first().click()
      await page.waitForURL(/\/giris/, { timeout: 5_000 })
    }
  })
})
