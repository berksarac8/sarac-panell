# Sarac Panel

Sarac Tavukçuluk için broiler çiftliği yönetim paneli (iç kullanım).

## Modüller
- Dashboard (özet ekran)
- Ödemeler (çek/fatura/taksit takibi)
- Sürü (3 blok dönem yönetimi, tartı/ölüm/yem)
- Olaylar (çiftlik olay defteri)

## Geliştirme

```powershell
npm install
Copy-Item .env.example .env.local  # Supabase bilgilerini doldur
npm run dev
```

http://localhost:3000

## Test

```powershell
npm run test          # birim testleri (Vitest)
npm run test:e2e      # uçtan uca testler (Playwright)
```

## Deploy

Plan 3'te Vercel + GoDaddy CNAME ile `ciftlik.saractavukculuk.com` üzerinde yayında.
