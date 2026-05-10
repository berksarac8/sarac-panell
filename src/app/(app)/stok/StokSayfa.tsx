'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StokKalemDialog } from './StokKalemDialog'
import { StokHareketDialog } from './StokHareketDialog'
import type {
  StokKalemOzet,
  StokHareket,
  SuruDonemRef,
  StokKategori,
  HareketTipi,
} from '@/types/stok'
import { STOK_KATEGORI_LABEL, STOK_BIRIM_LABEL } from '@/types/stok'

type Props = {
  kalemler: StokKalemOzet[]
  hareketler: StokHareket[]
  donemler: SuruDonemRef[]
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n)
}

function fmtTL(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(n)
}

function kategoriRengi(k: StokKategori): string {
  switch (k) {
    case 'yem':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'ilac':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'malzeme':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function StokSayfa({ kalemler, hareketler, donemler }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  const aktifTab = sp.get('tab') === 'hareketler' ? 'hareketler' : 'kalemler'

  const [duzenleKalem, setDuzenleKalem] = useState<StokKalemOzet | null>(null)
  const [duzenleHareket, setDuzenleHareket] = useState<StokHareket | null>(null)
  const [hareketIcinKalem, setHareketIcinKalem] = useState<string | undefined>(undefined)
  const [yeniHareketOpen, setYeniHareketOpen] = useState(false)

  // Filtreler (hareketler tabı için)
  const [filtKalemId, setFiltKalemId] = useState(sp.get('kalem') ?? '')
  const [filtDonemId, setFiltDonemId] = useState(sp.get('donem') ?? '')
  const [filtTip, setFiltTip] = useState(sp.get('tip') ?? '')
  const [filtBas, setFiltBas] = useState(sp.get('bas') ?? '')
  const [filtBit, setFiltBit] = useState(sp.get('bit') ?? '')

  function setTab(v: string) {
    const params = new URLSearchParams(sp.toString())
    if (v === 'kalemler') params.delete('tab')
    else params.set('tab', v)
    startTransition(() => {
      const qs = params.toString()
      router.push(qs ? `?${qs}` : '?')
    })
  }

  function uygulaFiltre() {
    const params = new URLSearchParams()
    params.set('tab', 'hareketler')
    if (filtKalemId) params.set('kalem', filtKalemId)
    if (filtDonemId) params.set('donem', filtDonemId)
    if (filtTip) params.set('tip', filtTip)
    if (filtBas) params.set('bas', filtBas)
    if (filtBit) params.set('bit', filtBit)
    startTransition(() => router.push(`?${params.toString()}`))
  }

  function temizleFiltre() {
    setFiltKalemId('')
    setFiltDonemId('')
    setFiltTip('')
    setFiltBas('')
    setFiltBit('')
    startTransition(() => router.push('?tab=hareketler'))
  }

  const toplamDeger = useMemo(
    () =>
      hareketler.reduce(
        (s, h) =>
          h.hareket_tipi === 'giris' && h.birim_fiyat != null
            ? s + Number(h.miktar) * Number(h.birim_fiyat)
            : s,
        0
      ),
    [hareketler]
  )

  function acHareketIcin(kalemId: string) {
    setHareketIcinKalem(kalemId)
    setYeniHareketOpen(true)
  }

  return (
    <div className="space-y-4">
      <Tabs value={aktifTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="kalemler">Kalemler</TabsTrigger>
          <TabsTrigger value="hareketler">Hareketler</TabsTrigger>
        </TabsList>

        <TabsContent value="kalemler" className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="text-lg font-semibold">Stok Kalemleri ({kalemler.length})</h2>
            <StokKalemDialog
              trigger={
                <button className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md">
                  + Yeni Kalem
                </button>
              }
            />
          </div>

          {kalemler.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border rounded-md bg-card">
              Henüz stok kalemi yok. Yem, ilaç vb. eklemek için &quot;+ Yeni Kalem&quot;e bas.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">İsim</th>
                    <th className="px-3 py-2">Kategori</th>
                    <th className="px-3 py-2">Birim</th>
                    <th className="px-3 py-2 text-right">Giriş</th>
                    <th className="px-3 py-2 text-right">Çıkış</th>
                    <th className="px-3 py-2 text-right">Mevcut</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {kalemler.map((k) => (
                    <tr key={k.id} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{k.isim}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full border text-xs ${kategoriRengi(k.kategori)}`}
                        >
                          {STOK_KATEGORI_LABEL[k.kategori]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{STOK_BIRIM_LABEL[k.birim]}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">
                        {fmtNum(k.toplam_giris)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-rose-700">
                        {fmtNum(k.toplam_cikis)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-semibold ${
                          k.mevcut < 0 ? 'text-rose-700' : 'text-ink'
                        }`}
                      >
                        {fmtNum(k.mevcut)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => acHareketIcin(k.id)}
                            className="text-xs px-2 py-1 border rounded hover:bg-white"
                            title="Bu kaleme hareket ekle"
                          >
                            + Hareket
                          </button>
                          <button
                            onClick={() => setDuzenleKalem(k)}
                            className="text-xs px-2 py-1 border rounded hover:bg-white"
                          >
                            Düzenle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="hareketler" className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="text-lg font-semibold">
              Stok Hareketleri ({hareketler.length})
              {toplamDeger > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  Toplam giriş değeri: {fmtTL(toplamDeger)}
                </span>
              )}
            </h2>
            <button
              onClick={() => {
                setHareketIcinKalem(undefined)
                setYeniHareketOpen(true)
              }}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md"
            >
              + Yeni Hareket
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3">
            <div>
              <label className="text-xs text-muted-foreground">Kalem</label>
              <select
                value={filtKalemId}
                onChange={(e) => setFiltKalemId(e.target.value)}
                className="block mt-1 text-sm border rounded px-2 py-1"
              >
                <option value="">Hepsi</option>
                {kalemler.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.isim}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tip</label>
              <select
                value={filtTip}
                onChange={(e) => setFiltTip(e.target.value)}
                className="block mt-1 text-sm border rounded px-2 py-1"
              >
                <option value="">Hepsi</option>
                <option value="giris">Giriş</option>
                <option value="cikis">Çıkış</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sürü dönemi</label>
              <select
                value={filtDonemId}
                onChange={(e) => setFiltDonemId(e.target.value)}
                className="block mt-1 text-sm border rounded px-2 py-1"
              >
                <option value="">Hepsi</option>
                {donemler.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.donem_no}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tarih ≥</label>
              <input
                type="date"
                value={filtBas}
                onChange={(e) => setFiltBas(e.target.value)}
                className="block mt-1 text-sm border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tarih ≤</label>
              <input
                type="date"
                value={filtBit}
                onChange={(e) => setFiltBit(e.target.value)}
                className="block mt-1 text-sm border rounded px-2 py-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={uygulaFiltre}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md"
              >
                Uygula
              </button>
              <button
                type="button"
                onClick={temizleFiltre}
                className="text-sm border px-3 py-1.5 rounded-md"
              >
                Temizle
              </button>
            </div>
          </div>

          {hareketler.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border rounded-md bg-card">
              Kayıt yok.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Tarih</th>
                    <th className="px-3 py-2">Kalem</th>
                    <th className="px-3 py-2">Tip</th>
                    <th className="px-3 py-2 text-right">Miktar</th>
                    <th className="px-3 py-2 text-right">Birim Fiyat</th>
                    <th className="px-3 py-2 text-right">Toplam</th>
                    <th className="px-3 py-2">Tedarikçi</th>
                    <th className="px-3 py-2">Dönem</th>
                  </tr>
                </thead>
                <tbody>
                  {hareketler.map((h) => {
                    const toplam =
                      h.birim_fiyat != null ? Number(h.miktar) * Number(h.birim_fiyat) : null
                    return (
                      <tr
                        key={h.id}
                        onClick={() => setDuzenleHareket(h)}
                        className="border-t hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{h.tarih}</td>
                        <td className="px-3 py-2">{h.kalem?.isim ?? '—'}</td>
                        <td className="px-3 py-2">
                          <HareketTipiBadge tip={h.hareket_tipi} />
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {fmtNum(Number(h.miktar))} {h.kalem?.birim ?? ''}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {h.birim_fiyat != null ? fmtTL(Number(h.birim_fiyat)) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {toplam != null ? fmtTL(toplam) : '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{h.tedarikci ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {h.donem?.donem_no ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {duzenleKalem && (
        <StokKalemDialog
          duzenle={duzenleKalem}
          defaultOpen
          onClose={() => setDuzenleKalem(null)}
        />
      )}

      {duzenleHareket && (
        <StokHareketDialog
          kalemler={kalemler}
          donemler={donemler}
          duzenle={duzenleHareket}
          defaultOpen
          onClose={() => setDuzenleHareket(null)}
        />
      )}

      {yeniHareketOpen && (
        <StokHareketDialog
          kalemler={kalemler}
          donemler={donemler}
          initialKalemId={hareketIcinKalem}
          open={yeniHareketOpen}
          onOpenChange={setYeniHareketOpen}
        />
      )}
    </div>
  )
}

function HareketTipiBadge({ tip }: { tip: HareketTipi }) {
  if (tip === 'giris') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full border text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
        Giriş
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full border text-xs bg-rose-100 text-rose-800 border-rose-200">
      Çıkış
    </span>
  )
}
