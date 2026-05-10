'use client'

import { useEffect, useState, useTransition } from 'react'
import { getBlokMetrikleri, listSu } from '@/lib/actions/suru-metrik'
import type { BlokGunlukMetrik, SuruSuKaydi } from '@/types/suru-metrik'
import type { SuruDonemDetay } from '@/types/suru'
import { SuDialog } from './SuDialog'

const NF_INT = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
const NF_2 = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const NF_1 = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return NF_INT.format(v)
}

function fmt2(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return NF_2.format(v)
}

function fmt1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return NF_1.format(v)
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${NF_1.format(v)}%`
}

export function OzetSekmesi({ donem }: { donem: SuruDonemDetay }) {
  const [blokNo, setBlokNo] = useState<1 | 2 | 3>(1)
  const [metrikler, setMetrikler] = useState<BlokGunlukMetrik[]>([])
  const [suKayitlari, setSuKayitlari] = useState<SuruSuKaydi[]>([])
  const [hata, setHata] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Her blok değişiminde veya donem.id güncellenmesinde verileri çek
  useEffect(() => {
    setHata(null)
    startTransition(async () => {
      const [metRes, suRes] = await Promise.all([
        getBlokMetrikleri(donem.id, blokNo),
        listSu(donem.id, blokNo),
      ])
      if (metRes.error) {
        setHata(metRes.error)
        setMetrikler([])
      } else {
        setMetrikler(metRes.data)
      }
      if (!suRes.error) {
        setSuKayitlari(suRes.data)
      } else {
        setSuKayitlari([])
      }
    })
  }, [donem.id, blokNo])

  // Blok bu sürüde tanımlı mı?
  const blokVar = donem.bloklar.some((b) => b.blok_no === blokNo)

  // Su kaydı için lookup map (gun_no → SuruSuKaydi)
  const suMap = new Map<number, SuruSuKaydi>()
  for (const s of suKayitlari) suMap.set(s.gun_no, s)

  return (
    <div className="space-y-4">
      {/* Blok seçici + Yeni Su Kaydı */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-card p-1">
          {([1, 2, 3] as const).map((no) => {
            const aktif = blokNo === no
            return (
              <button
                key={no}
                type="button"
                onClick={() => setBlokNo(no)}
                className={
                  'px-3 py-1.5 text-sm rounded-md transition-colors ' +
                  (aktif
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-slate-50')
                }
              >
                Blok {no}
              </button>
            )
          })}
        </div>

        <SuDialog
          donemId={donem.id}
          blokNo={blokNo}
          girisTarihi={donem.giris_tarihi}
          trigger={
            <button
              type="button"
              disabled={!blokVar}
              className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              + Yeni Su Kaydı
            </button>
          }
        />

        {pending && (
          <span className="text-xs text-muted-foreground">Yükleniyor…</span>
        )}
      </div>

      {hata && (
        <div className="rounded border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">
          Hata: {hata}
        </div>
      )}

      {!blokVar ? (
        <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
          Blok {blokNo} bu sürüde tanımlı değil.
        </div>
      ) : metrikler.length === 0 && !pending ? (
        <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu blok için henüz su veya ölüm kaydı yok. Tablo ilk veriyle birlikte
          dolacak.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left uppercase text-muted-foreground">
              <tr>
                <Th>Gün</Th>
                <Th>Tarih</Th>
                <Th right>Ölü</Th>
                <Th right>Kalan</Th>
                <Th right>Su (L)</Th>
                <Th right>Hayvan/su (ml)</Th>
                <Th right>Banvit su</Th>
                <Th right>Beklenen su (L)</Th>
                <Th right>Su gerç. %</Th>
                <Th right>Banvit yem (gr)</Th>
                <Th right>Yem/su oranı</Th>
                <Th right>Beklenen yem (kg)</Th>
                <Th right>Hayvan/yem (gr)</Th>
                <Th right>Bizim küm. yem</Th>
                <Th right>Banvit küm. yem</Th>
                <Th right>Banvit küm. gr</Th>
                <Th right>Tahmini gr</Th>
                <Th right>Günlük büyüme</Th>
                <Th right>Banvit gün. büyüme</Th>
                <Th right>Büyüme fark %</Th>
              </tr>
            </thead>
            <tbody>
              {metrikler.map((m) => {
                const suKayit = suMap.get(m.gun_no) ?? null
                return (
                  <tr key={m.gun_no} className="border-t hover:bg-slate-50/60">
                    <Td>{m.gun_no}</Td>
                    <Td>{m.tarih ?? '—'}</Td>
                    <Td right mono>
                      {fmtInt(m.gunluk_olum)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.kalan_hayvan)}
                    </Td>
                    {/* Su (L) — tıklanabilir */}
                    <td className="px-2 py-1.5 text-right border-l border-slate-100">
                      <SuDialog
                        donemId={donem.id}
                        blokNo={blokNo}
                        girisTarihi={donem.giris_tarihi}
                        duzenle={suKayit}
                        trigger={
                          <button
                            type="button"
                            className={
                              'font-mono inline-block w-full text-right px-1 rounded hover:bg-indigo-100 ' +
                              (suKayit
                                ? 'text-indigo-700 cursor-pointer hover:underline'
                                : 'text-muted-foreground cursor-pointer')
                            }
                            title={
                              suKayit ? 'Düzenle / Sil' : 'Su kaydı yok (ekle)'
                            }
                          >
                            {suKayit ? fmt1(m.gunluk_su_litre) : '—'}
                          </button>
                        }
                      />
                    </td>
                    {/* Hayvan/su (ml) — yeşil renk koşullu */}
                    <td
                      className={
                        'px-2 py-1.5 text-right font-mono border-l border-slate-100 ' +
                        (m.su_yesil ? 'bg-emerald-100 text-emerald-900' : '')
                      }
                    >
                      {fmtInt(m.hayvan_basina_su_ml)}
                    </td>
                    <Td right mono>
                      {fmtInt(m.banvit_su_ml)}
                    </Td>
                    <Td right mono>
                      {fmt1(m.beklenen_su_litre)}
                    </Td>
                    <Td right mono>
                      {fmtPct(m.su_gerceklesme_yuzde)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.banvit_yem_gr)}
                    </Td>
                    <Td right mono>
                      {fmt2(m.banvit_yem_su_orani)}
                    </Td>
                    <Td right mono>
                      {fmt1(m.beklenen_yem_kg)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.hayvan_basina_yem_gr)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.bizim_cumulative_yem_gr)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.banvit_cumulative_yem_gr)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.banvit_cumulative_gr)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.tahmini_ortalama_gr)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.gunluk_buyume_tahmini_gr)}
                    </Td>
                    <Td right mono>
                      {fmtInt(m.banvit_gunluk_buyume_gr)}
                    </Td>
                    {/* Büyüme fark % — yeşil/kırmızı/nötr */}
                    <td
                      className={
                        'px-2 py-1.5 text-right font-mono border-l border-slate-100 ' +
                        (m.buyume_yesil === true
                          ? 'bg-emerald-100 text-emerald-900'
                          : m.buyume_yesil === false
                            ? 'bg-rose-100 text-rose-900'
                            : '')
                      }
                    >
                      {fmtPct(m.buyume_fark_yuzde)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Yeşil hayvan başına su = bizim Banvit referansının üzerinde. Yeşil büyüme
        farkı = beklenenden daha hızlı büyüme. Su (L) hücresine tıklayarak
        düzenle veya sil.
      </p>
    </div>
  )
}

function Th({
  children,
  right = false,
}: {
  children: React.ReactNode
  right?: boolean
}) {
  return (
    <th
      className={
        'px-2 py-2 font-medium whitespace-nowrap border-l border-slate-200 first:border-l-0 ' +
        (right ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  )
}

function Td({
  children,
  right = false,
  mono = false,
}: {
  children: React.ReactNode
  right?: boolean
  mono?: boolean
}) {
  return (
    <td
      className={
        'px-2 py-1.5 whitespace-nowrap border-l border-slate-100 first:border-l-0 ' +
        (right ? 'text-right ' : '') +
        (mono ? 'font-mono ' : '')
      }
    >
      {children}
    </td>
  )
}
