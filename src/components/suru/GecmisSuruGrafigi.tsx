'use client'

/**
 * Geçmiş Sürü Karşılaştırma Grafiği
 *
 * Son N (genelde 5) kapalı dönemin temel metriklerini (FCR, kayıp %, ortalama kg)
 * yan yana barlar olarak gösterir. recharts bağımlılığını eklememek için saf SVG
 * ile çizilir — bar yüksekliği metrik bazında normalize edilir.
 *
 * Entegrasyon: bu component'i `/suru` sayfasından veya dashboard'dan
 * `getGecmisSuruMetrikleri()` action sonucu ile çağır.
 */

export type GecmisSuruMetrik = {
  donemNo: string
  fcr: number | null
  kayipYuzde: number | null
  ortalamaKg: number | null
}

const METRIK_LIST = [
  { key: 'fcr', label: 'FCR', renk: '#6366f1' }, // indigo
  { key: 'kayipYuzde', label: 'Kayıp %', renk: '#f43f5e' }, // rose
  { key: 'ortalamaKg', label: 'Ort. Kg', renk: '#10b981' }, // emerald
] as const

type MetrikKey = (typeof METRIK_LIST)[number]['key']

const NF_2 = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function fmt(v: number | null | undefined, suffix = ''): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return NF_2.format(v) + suffix
}

export function GecmisSuruGrafigi({ donemler }: { donemler: GecmisSuruMetrik[] }) {
  if (donemler.length === 0) {
    return (
      <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
        Henüz kapanmış sürü yok — grafik için en az 1 kapalı dönem gerekli.
      </div>
    )
  }

  // Her metrik için max değer (normalize)
  const maxlar: Record<MetrikKey, number> = {
    fcr: 0,
    kayipYuzde: 0,
    ortalamaKg: 0,
  }
  for (const d of donemler) {
    for (const m of METRIK_LIST) {
      const v = d[m.key]
      if (v !== null && Number.isFinite(v) && v > maxlar[m.key]) {
        maxlar[m.key] = v
      }
    }
  }

  // Çizim parametreleri
  const BAR_W = 14
  const GAP_BAR = 4
  const GAP_GROUP = 24
  const groupW = METRIK_LIST.length * BAR_W + (METRIK_LIST.length - 1) * GAP_BAR
  const totalW = donemler.length * groupW + (donemler.length - 1) * GAP_GROUP
  const H = 200
  const PAD_TOP = 16
  const PAD_BOTTOM = 32 // dönem no için
  const chartH = H - PAD_TOP - PAD_BOTTOM
  const SVG_W = Math.max(totalW + 32, 320)

  function barH(metrik: MetrikKey, v: number | null): number {
    if (v === null || !Number.isFinite(v)) return 0
    const max = maxlar[metrik]
    if (max <= 0) return 0
    return (v / max) * chartH
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Son {donemler.length} Sürü — Karşılaştırma</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          {METRIK_LIST.map((m) => (
            <span key={m.key} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: m.renk }}
              />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={SVG_W}
          height={H}
          viewBox={`0 0 ${SVG_W} ${H}`}
          className="block"
          role="img"
          aria-label="Geçmiş sürü karşılaştırma bar chart"
        >
          {/* Baz çizgi */}
          <line
            x1={16}
            y1={PAD_TOP + chartH}
            x2={SVG_W - 16}
            y2={PAD_TOP + chartH}
            stroke="#e2e8f0"
            strokeWidth={1}
          />

          {donemler.map((d, i) => {
            const groupX = 16 + i * (groupW + GAP_GROUP)
            return (
              <g key={d.donemNo}>
                {METRIK_LIST.map((m, j) => {
                  const v = d[m.key]
                  const h = barH(m.key, v)
                  const x = groupX + j * (BAR_W + GAP_BAR)
                  const y = PAD_TOP + chartH - h
                  return (
                    <g key={m.key}>
                      <rect
                        x={x}
                        y={y}
                        width={BAR_W}
                        height={h}
                        fill={m.renk}
                        rx={2}
                      >
                        <title>
                          {`${d.donemNo} — ${m.label}: ${fmt(v)}`}
                        </title>
                      </rect>
                      {v !== null && Number.isFinite(v) && h > 14 && (
                        <text
                          x={x + BAR_W / 2}
                          y={y + 10}
                          textAnchor="middle"
                          fontSize="9"
                          fill="white"
                          className="pointer-events-none"
                        >
                          {NF_2.format(v)}
                        </text>
                      )}
                    </g>
                  )
                })}
                {/* Dönem no etiketi */}
                <text
                  x={groupX + groupW / 2}
                  y={PAD_TOP + chartH + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#475569"
                  className="font-mono"
                >
                  {d.donemNo}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Sayısal özet tablosu (grafik altında) */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="px-2 py-1">Dönem</th>
              {METRIK_LIST.map((m) => (
                <th key={m.key} className="px-2 py-1 text-right">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {donemler.map((d) => (
              <tr key={d.donemNo} className="border-t">
                <td className="px-2 py-1 font-mono">{d.donemNo}</td>
                <td className="px-2 py-1 text-right font-mono">{fmt(d.fcr)}</td>
                <td className="px-2 py-1 text-right font-mono">
                  {fmt(d.kayipYuzde, '%')}
                </td>
                <td className="px-2 py-1 text-right font-mono">{fmt(d.ortalamaKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
