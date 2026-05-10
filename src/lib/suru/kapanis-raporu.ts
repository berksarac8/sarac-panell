import type {
  SuruDonem,
  SuruBlok,
  SuruOlum,
} from '@/types/suru'
import type {
  BanvitReferans,
  SuruSuKaydi,
} from '@/types/suru-metrik'

/**
 * Tek bir blok için kapanış raporu metrikleri.
 *
 * Hesaplananlar:
 *   - giris_adedi, cikis_adedi, cikis_kg, cikis_tarihi
 *   - toplam_olum: blok-spesifik veya 'genel' kaydedilen ölümler bu bloğa pay edilmez
 *     (genel ölümler, başka bir helper'da bölünebilir; burada blok ölüm = sadece blok_no=bu)
 *   - kayip_adet: giris - cikis (kayip kullanımı: ölmüş + kayıp)
 *   - kayip_yuzde: kayip_adet / giris × 100
 *   - ortalama_kg: cikis_kg / cikis_adedi (cikis_adedi 0 ise null)
 *   - toplam_su_litre: blok için toplam su (yetersizse 0)
 *   - tahmini_toplam_yem_kg: Banvit referansından tahmin
 *     (her gün için: gunluk_su_litre × banvit_yem_gr / banvit_su_ml, gün > 44 ise null pay edilmez)
 *   - tahmini_canli_agirlik_kg: cikis_adedi × ortalama_kg
 *   - fcr: tahmini_toplam_yem_kg / (cikis_kg - tahmini_baslangic_agirlik_kg)
 *     (cikis_kg sıfır veya yem 0 ise null)
 */
export type BlokKapanisRapor = {
  blokNo: 1 | 2 | 3
  girisAdedi: number
  cikisAdedi: number | null
  cikisKg: number | null
  cikisTarihi: string | null
  toplamOlum: number
  kayipAdet: number | null
  kayipYuzde: number | null
  ortalamaKg: number | null
  toplamSuLitre: number
  tahminiToplamYemKg: number | null
  tahminiCanliAgirlikKg: number | null
  fcr: number | null
}

export type DonemKapanisRapor = {
  donemNo: string
  girisTarihi: string
  cikisTarihi: string | null // en son blok kapanışı (yoksa null)
  gunSayisi: number | null // giris → cikis arası gün (cikisTarihi yoksa null)
  toplamGiris: number
  toplamCikisAdet: number
  toplamCikisKg: number
  toplamOlum: number
  kayipAdet: number
  kayipYuzde: number | null
  ortalamaKg: number | null // toplamCikisKg / toplamCikisAdet
  toplamSuLitre: number
  tahminiToplamYemKg: number | null
  fcr: number | null
  durum: 'aktif' | 'kapali'
  bloklar: BlokKapanisRapor[]
}

function gunNoHesapla(girisTarihi: string, hedefTarih: string): number {
  const giris = new Date(girisTarihi + 'T00:00:00Z')
  const hedef = new Date(hedefTarih + 'T00:00:00Z')
  const ms = hedef.getTime() - giris.getTime()
  const gun = Math.floor(ms / (1000 * 60 * 60 * 24))
  return gun + 1
}

/**
 * Saf fonksiyon: ham veriyi alıp dönem ve blok bazlı kapanış raporu üretir.
 *
 * - olumler: tüm dönem ölümleri (blok_no null = "genel", her bloğa pay edilmez burada;
 *   sadece donem toplamına eklenir, bloklar kendi blok_no'larındaki ölümleri sayar)
 * - sular: blok bazlı su kayıtları (blok_no 1-3)
 * - banvitRefs: 1-44 arası referans (gun_no→ref)
 *
 * Aktif sürü için de çalışır ama anlamlı sonuç ancak kapanmış sürüde gelir.
 */
export function hesaplaKapanisRaporu(input: {
  donem: SuruDonem
  bloklar: SuruBlok[]
  sular: SuruSuKaydi[]
  olumler: SuruOlum[]
  banvitRefs: BanvitReferans[]
}): DonemKapanisRapor {
  const { donem, bloklar, sular, olumler, banvitRefs } = input

  // Banvit map
  const banvitMap = new Map<number, BanvitReferans>()
  for (const r of banvitRefs) banvitMap.set(r.gun_no, r)

  // Bloğa pay edilmemiş "genel" ölümler dönem toplamına dahil; blok sayımı blok_no=bu
  const blokSirali = [...bloklar].sort((a, b) => a.blok_no - b.blok_no)

  const blokRaporlari: BlokKapanisRapor[] = blokSirali.map((b) => {
    const blokOlumler = olumler.filter((o) => o.blok_no === b.blok_no)
    const toplamOlum = blokOlumler.reduce((s, o) => s + (o.adet ?? 0), 0)

    const cikisAdedi = b.cikis_adedi
    const cikisKg = b.cikis_kg
    const cikisTarihi = b.cikis_tarihi

    // kayip = giriş - çıkış (çıkış yoksa null)
    const kayipAdet =
      cikisAdedi !== null && cikisAdedi !== undefined
        ? Math.max(0, b.giris_adedi - cikisAdedi)
        : null
    const kayipYuzde =
      kayipAdet !== null && b.giris_adedi > 0
        ? (kayipAdet / b.giris_adedi) * 100
        : null
    const ortalamaKg =
      cikisAdedi !== null && cikisAdedi !== undefined && cikisAdedi > 0 && cikisKg !== null && cikisKg !== undefined
        ? cikisKg / cikisAdedi
        : null

    // Blok suları
    const blokSular = sular.filter((s) => s.blok_no === b.blok_no)
    const toplamSuLitre = blokSular.reduce((s, x) => s + Number(x.su_litre), 0)

    // Tahmini yem: her su kaydı için banvit_yem_gr/banvit_su_ml oranı × su_litre
    let tahminiToplamYemKg: number | null = null
    let yemBuldukMu = false
    let yemAcc = 0
    for (const s of blokSular) {
      const ref = banvitMap.get(s.gun_no)
      if (!ref || ref.beklenen_su_ml <= 0) continue
      const yemKg = (Number(s.su_litre) * ref.beklenen_yem_gr) / ref.beklenen_su_ml
      yemAcc += yemKg
      yemBuldukMu = true
    }
    if (yemBuldukMu) tahminiToplamYemKg = yemAcc

    // Tahmini canlı ağırlık
    const tahminiCanliAgirlikKg =
      cikisAdedi !== null && cikisAdedi !== undefined && ortalamaKg !== null
        ? cikisAdedi * ortalamaKg
        : null

    // FCR = toplam yem / toplam kazanılan kg (~ çıkış kg, başlangıç ihmal edilir)
    // Excel'de tipik: yem_kg / cikis_kg
    const fcr =
      tahminiToplamYemKg !== null && cikisKg !== null && cikisKg !== undefined && cikisKg > 0
        ? tahminiToplamYemKg / cikisKg
        : null

    return {
      blokNo: b.blok_no,
      girisAdedi: b.giris_adedi,
      cikisAdedi: cikisAdedi ?? null,
      cikisKg: cikisKg ?? null,
      cikisTarihi: cikisTarihi ?? null,
      toplamOlum,
      kayipAdet,
      kayipYuzde,
      ortalamaKg,
      toplamSuLitre,
      tahminiToplamYemKg,
      tahminiCanliAgirlikKg,
      fcr,
    }
  })

  // Dönem geneli
  const toplamGiris = blokSirali.reduce((s, b) => s + b.giris_adedi, 0)
  const toplamCikisAdet = blokSirali.reduce(
    (s, b) => s + (b.cikis_adedi ?? 0),
    0
  )
  const toplamCikisKg = blokSirali.reduce(
    (s, b) => s + (b.cikis_kg ?? 0),
    0
  )
  // Genel ölümler dahil
  const toplamOlum = olumler.reduce((s, o) => s + (o.adet ?? 0), 0)
  const kayipAdet = Math.max(0, toplamGiris - toplamCikisAdet)
  const kayipYuzde = toplamGiris > 0 ? (kayipAdet / toplamGiris) * 100 : null
  const ortalamaKg =
    toplamCikisAdet > 0 ? toplamCikisKg / toplamCikisAdet : null
  const toplamSuLitre = blokRaporlari.reduce((s, b) => s + b.toplamSuLitre, 0)

  // Tahmini toplam yem (blok yemleri toplamı; tümü null ise null)
  const yemler = blokRaporlari
    .map((b) => b.tahminiToplamYemKg)
    .filter((v): v is number => v !== null)
  const tahminiToplamYemKg =
    yemler.length > 0 ? yemler.reduce((a, b) => a + b, 0) : null

  const fcr =
    tahminiToplamYemKg !== null && toplamCikisKg > 0
      ? tahminiToplamYemKg / toplamCikisKg
      : null

  // Çıkış tarihi: en son kapanan blok
  const cikisTarihler = blokSirali
    .map((b) => b.cikis_tarihi)
    .filter((t): t is string => !!t)
    .sort()
  const cikisTarihi = cikisTarihler.length > 0 ? cikisTarihler[cikisTarihler.length - 1] : null
  const gunSayisi = cikisTarihi ? gunNoHesapla(donem.giris_tarihi, cikisTarihi) : null

  return {
    donemNo: donem.donem_no,
    girisTarihi: donem.giris_tarihi,
    cikisTarihi,
    gunSayisi,
    toplamGiris,
    toplamCikisAdet,
    toplamCikisKg,
    toplamOlum,
    kayipAdet,
    kayipYuzde,
    ortalamaKg,
    toplamSuLitre,
    tahminiToplamYemKg,
    fcr,
    durum: donem.durum,
    bloklar: blokRaporlari,
  }
}
