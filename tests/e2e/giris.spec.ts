import { test, expect } from '@playwright/test'

test('giris sayfasi gosterilir ve hatali bilgi reddedilir', async ({ page }) => {
  await page.goto('/giris')
  await expect(page.getByRole('heading', { name: /Sarac/i })).toBeVisible()
  await expect(page.getByLabel('E-posta')).toBeVisible()
  await expect(page.getByLabel('Şifre')).toBeVisible()

  await page.getByLabel('E-posta').fill('yanlis@kullanici.com')
  await page.getByLabel('Şifre').fill('wrongpass-123')
  await page.getByRole('button', { name: /Giriş yap/i }).click()

  await expect(page.getByText(/Hatalı/i)).toBeVisible({ timeout: 5000 })
})
