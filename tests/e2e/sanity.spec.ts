import { test, expect } from '@playwright/test'

test('ana sayfa açılır (giriş ekranına yönlendirilir)', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/giris/)
})
