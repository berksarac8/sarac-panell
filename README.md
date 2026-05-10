# Sarac Panel

Sarac Tavukçuluk için broiler çiftliği yönetim paneli (iç kullanım).
Üretim: `https://ciftlik.saractavukculuk.com`

## Modüller

- **Dashboard** — hızlı eylemler + aktif sürü kartı + acil ödemeler + son olaylar
- **Ödemeler** — çek/fatura/taksit takibi, tekrarlayan ödemeler, takvim görünümü
- **Sürü** — 3 blok dönem yönetimi, tartı/ölüm/yem kayıtları, blok kapatma
- **Olaylar** — çiftlik olay defteri, sürü dönemine bağlanabilir

## Yığın

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind 4 · Supabase
(Auth + Postgres + RLS) · base-ui dialog/dropdown · Vitest + Playwright.

## Geliştirme

Gerekli: Node.js 20+ ve npm.

```powershell
npm install
Copy-Item .env.example .env.local  # Supabase bilgilerini doldur
npm run dev
```

Tarayıcıda <http://localhost:3000>

## Test

```powershell
npm run test:run     # birim testleri (Vitest)
npm run lint         # ESLint
npm run test:e2e     # uçtan uca testler (Playwright)
```

Smoke testi (`tests/e2e/smoke.spec.ts`) çalışırsa `.env.local`
içinde `TEST_USER_EMAIL` ve `TEST_USER_PASSWORD` tanımlı olmalı; yoksa
test atlanır.

## Kullanıcı oluşturma (Supabase)

Selin/Abdullah/diğer kullanıcılar Supabase Dashboard üzerinden manuel
açılır:

1. Supabase Dashboard → **Authentication → Users → Add user**
2. E-posta + şifre, "**Auto Confirm User**" işaretli olsun.
3. SQL Editor'de profile satırı ekle:
   ```sql
   insert into profiles (id, ad_soyad)
   values ('<user-id>', 'Abdullah Saraç');
   ```
4. Kullanıcı `ciftlik.saractavukculuk.com/giris` üzerinden giriş yapar.

## Deploy

Adım adım talimatlar: bkz. [DEPLOY.md](./DEPLOY.md)

Ortam değişkenleri (Vercel → Environment Variables):

| Anahtar | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (sadece server) |
| `NEXT_PUBLIC_APP_URL` | `https://ciftlik.saractavukculuk.com` |

## Dizin

```
src/
  app/
    (app)/         # giriş yapmış kullanıcı için sayfalar
      page.tsx     # dashboard
      odemeler/    # ödeme modülü
      olaylar/     # olay modülü
      suru/        # sürü modülü
    giris/         # giriş ekranı
  components/      # ortak UI
  lib/
    actions/       # server actions (odemeler, olaylar, suru, dashboard)
    odemeler/      # durum hesabı, tekrar üretici
    suru/          # dönem no, kapanış mantığı
    supabase/      # client/server factory
  types/           # TS tipleri
supabase/          # SQL migration dosyaları
tests/
  unit/            # Vitest birim testleri
  e2e/             # Playwright testleri
```
