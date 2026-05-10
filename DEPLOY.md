# Deploy — Sarac Panel

Hedef: `https://ciftlik.saractavukculuk.com`
Yığın: Vercel (Next.js) + Supabase (zaten kurulu) + GoDaddy (DNS).

Bu dosya **manuel** adımları içerir. Selin tek tek izlemeli; Claude bunları
otomatik yapamaz.

---

## M5 — GitHub repo açma (sarac-panel, private)

1. <https://github.com/new> aç.
2. **Owner**: `selinerguven` (kişisel) veya bir org. **Repository name**: `sarac-panel`. **Private** işaretle.
3. README/license/`.gitignore` **ekleme** (zaten var). "Create repository".
4. Yerel repo'yu push et:

   ```powershell
   cd C:\Users\selin\sarac-panel
   git remote add origin https://github.com/<kullanici-adi>/sarac-panel.git
   git branch -M main
   git push -u origin main
   ```

5. Push hatası verirse, GitHub'da Personal Access Token üret
   (Settings → Developer settings → Personal access tokens → Fine-grained →
   sadece bu repo'ya `Contents: write`) ve şifre yerine onu kullan.

---

## M6 — Vercel'e bağlama

1. <https://vercel.com> hesabına gir (GitHub ile birleştirilmiş olsa kolay).
2. **Add New → Project → Import Git Repository → sarac-panel**.
3. Framework otomatik **Next.js** olarak algılanır. **Root Directory** `./`.
   Build/Output ayarlarına dokunma.
4. **Environment Variables** sekmesine değişkenleri gir (Production + Preview
   + Development üçü için):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://aludvzwmvxporkgbnotd.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase Dashboard → API → anon public key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | (Supabase Dashboard → API → service_role key — **gizli**) |
   | `NEXT_PUBLIC_APP_URL` | `https://ciftlik.saractavukculuk.com` |
   | `TELEGRAM_BOT_TOKEN` | `8791017360:AAH8dsUeVVelEQS4Yl1hqq-4ssPWT27iCsE` (günlük ödeme bildirimi botu) |
   | `TELEGRAM_CHAT_ID` | `5579881591` (Selin) |
   | `CRON_SECRET` | rastgele 32+ karakter; PowerShell: `[Convert]::ToBase64String((1..32 \| %{Get-Random -Max 256}))` veya WSL: `openssl rand -base64 32` |

   Anahtar değerleri yerel `.env.local`'den kopyalanabilir.
5. **Deploy**. İlk build ~2-3 dakika sürer. Yeşil tik gelmeli.
6. Vercel default URL'sini test et (`sarac-panel-xxx.vercel.app`). Giriş
   ekranı açılırsa OK.

---

## M7 — GoDaddy DNS (CNAME)

1. Vercel → Project → **Settings → Domains → Add**.
2. Domain alanına `ciftlik.saractavukculuk.com` yaz, **Add** bas.
3. Vercel sana ne göstereceğini söyleyecek. **CNAME** seçeneğini seç:
   - Tip: **CNAME**
   - Name (host): `ciftlik`
   - Value (points to): `cname.vercel-dns.com`
4. <https://account.godaddy.com> → Domain (saractavukculuk.com) → **DNS**.
5. **Add new record**:
   - Type: **CNAME**
   - Name: `ciftlik`
   - Value: `cname.vercel-dns.com`
   - TTL: 1 saat (varsayılan)
6. Kaydet. DNS yayılması 5-30 dakika.
7. Vercel'de "Verify" / "Refresh" bas. Yeşil tik + SSL otomatik gelir.

---

## M8 — Production smoke kontrolü

1. <https://ciftlik.saractavukculuk.com/giris> aç. Giriş ekranı çıksın.
2. Daha önce Supabase'de oluşturduğun kullanıcıyla giriş yap (kullanıcı
   yoksa: README → "Kullanıcı oluşturma").
3. Dashboard yüklensin.
4. **+ Ödeme** ile bir test kaydı oluştur. Listede görünür mü?
5. **+ Olay** ile bir test kaydı oluştur.
6. Aktif sürü yoksa **+ Yeni Sürü Aç** dene (sonra silebilirsin).

Hata olursa:

- Vercel → Project → **Logs** sekmesinde runtime hatasını gör.
- Browser DevTools → Network sekmesi → 5xx aldığın isteğe bak.
- Çoğu zaman env var eksik/hatalıdır — Vercel → Settings → Environment
  Variables kontrol.

---

## Ek: tekrar deploy

Yeni bir özellik eklediğinde:

```powershell
cd C:\Users\selin\sarac-panel
git add -A
git commit -m "feat: ..."
git push
```

Vercel `main` branch'ı izler ve otomatik deploy eder. Preview için PR
açabilirsin (her PR otomatik preview URL alır).

---

## Ek: Telegram günlük ödeme bildirimi (Vercel cron)

`vercel.json` içindeki cron her gün UTC **06:00** (İstanbul **09:00**, UTC+3)
`/api/cron/yaklasan-odemeler` endpoint'ini çağırır ve aşağıdaki içeriği
Telegram'a yollar:

- Gecikmiş (vade bugünden önce, henüz ödenmemiş)
- Yaklaşan 7 gün (vade bugün-7 arası, henüz ödenmemiş)
- Toplam tutar + ödemeler sayfasına link

Vercel Hobby planı günde 1 cron'a kadar ücretsiz — bu modül sınır içinde.

### Kurulum

1. Yukarıdaki tabloda **3 env var** Vercel'e eklendi (`TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_CHAT_ID`, `CRON_SECRET`).
2. `git push` → Vercel deploy → cron otomatik aktif.
3. **Doğrulama**: Vercel → Project → **Cron Jobs** sekmesinde
   `yaklasan-odemeler` görünmeli. "Run now" ile manuel tetikleyebilirsin.

### Manuel test (curl)

```powershell
# CRON_SECRET set'ti ise:
curl -H "Authorization: Bearer <CRON_SECRET>" `
  https://ciftlik.saractavukculuk.com/api/cron/yaklasan-odemeler

# CRON_SECRET henüz set değilse auth bypass çalışır:
curl https://ciftlik.saractavukculuk.com/api/cron/yaklasan-odemeler
```

Beklenen yanıt: `{ "sent": 1, "total": <n>, "gecikmis": <n>, "yaklasan": <n> }`
ve Telegram'a mesaj düşmesi.

### Sorun giderme

- **Mesaj gelmiyor**: Bot'a Telegram'da bir mesaj atıp `chat_id`'yi
  uyandırdığından emin ol. `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID`
  doğru mu? Vercel → Logs → `/api/cron/yaklasan-odemeler` çağrısının
  yanıtına bak.
- **401 Unauthorized**: `CRON_SECRET` header'da gönderilen değerle
  birebir eşleşmeli (Vercel cron header'ı kendi gönderir, manuel curl'de
  `Authorization: Bearer ...` ekle).
- **500 + "Supabase credentials missing"**: `SUPABASE_SERVICE_ROLE_KEY`
  Vercel'de tanımlı değil.

---

## Ek: Supabase bağımlılıkları

Şema migration'ları `supabase/` klasöründe. Üretim Supabase projesi zaten
kurulu (`aludvzwmvxporkgbnotd`). Yeni migration eklersen:

1. Supabase CLI ile `supabase db push` (CLI bağlıysa), veya
2. SQL Editor'e migration içeriğini elle çalıştır.

RLS politikaları kritik — `auth.uid()` üzerinden kullanıcı izolasyonu
yapıyoruz. `supabase/migrations/` içeriği üretimde de uygulanmalı.
