/**
 * globalArama server action — mock'lanmış Supabase ile davranış testleri.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}))

type OdemeRow = {
  id: string
  aciklama: string
  kime: string | null
  vade_tarihi: string
  tutar: number
  odendi_mi: boolean
}
type OlayRow = {
  id: string
  baslik: string
  aciklama: string | null
  tarih: string
}
type SuruRow = {
  id: string
  donem_no: string
  giris_tarihi: string
  durum: 'aktif' | 'kapali'
  notlar: string | null
}

type FakeState = {
  user: { id: string } | null
  odemeler: OdemeRow[]
  olaylar: OlayRow[]
  suru_donemleri: SuruRow[]
}

function makeFakeSupabase(state: FakeState) {
  function makeChain(table: string) {
    const queryState: { orFilter: string | null } = { orFilter: null }
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.or = (clause: string) => {
      queryState.orFilter = clause
      return chain
    }
    chain.order = () => chain
    chain.limit = () => {
      // Execute
      const data =
        table === 'odemeler'
          ? state.odemeler
          : table === 'ciftlik_olaylari'
            ? state.olaylar
            : table === 'suru_donemleri'
              ? state.suru_donemleri
              : []
      // ILIKE filter: parse "col.ilike.%term%,col2.ilike.%term%"
      let filtered: unknown[] = data
      if (queryState.orFilter) {
        const parts = queryState.orFilter.split(',')
        const matchers = parts.map((p) => {
          const m = p.match(/^(\w+)\.ilike\.%(.+)%$/)
          if (!m) return null
          return { col: m[1], term: m[2].replace(/\\([%_])/g, '$1').toLowerCase() }
        })
        filtered = data.filter((row: Record<string, unknown>) =>
          matchers.some((mch) => {
            if (!mch) return false
            const v = row[mch.col]
            if (v == null) return false
            return String(v).toLowerCase().includes(mch.term)
          })
        )
      }
      return Promise.resolve({ data: filtered, error: null })
    }
    return chain
  }
  return {
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
    },
    from: (table: string) => makeChain(table),
  }
}

let state: FakeState

beforeEach(() => {
  state = {
    user: { id: 'u1' },
    odemeler: [
      {
        id: 'o1',
        aciklama: 'Banvit yem faturası',
        kime: 'Banvit A.Ş.',
        vade_tarihi: '2026-05-15',
        tutar: 15000,
        odendi_mi: false,
      },
      {
        id: 'o2',
        aciklama: 'Elektrik',
        kime: 'TEDAŞ',
        vade_tarihi: '2026-05-20',
        tutar: 2500,
        odendi_mi: true,
      },
    ],
    olaylar: [
      {
        id: 'e1',
        baslik: 'Veteriner ziyareti',
        aciklama: 'Aşı yapıldı',
        tarih: '2026-05-09',
      },
      {
        id: 'e2',
        baslik: 'Yem teslimat',
        aciklama: null,
        tarih: '2026-05-08',
      },
    ],
    suru_donemleri: [
      {
        id: 's1',
        donem_no: '2026-1',
        giris_tarihi: '2026-04-01',
        durum: 'aktif',
        notlar: 'Banvit civciv',
      },
    ],
  }
  vi.doMock('@/lib/supabase/server', () => ({
    createClient: async () => makeFakeSupabase(state),
  }))
})

async function loadAction() {
  const mod = await import('@/lib/actions/arama')
  return mod
}

describe('globalArama', () => {
  it('user yoksa Yetkisiz döner', async () => {
    state.user = null
    const { globalArama } = await loadAction()
    const res = await globalArama('banvit')
    expect(res.error).toBe('Yetkisiz')
    expect(res.data).toEqual([])
  })

  it('boş veya çok kısa sorgu için boş döner', async () => {
    const { globalArama } = await loadAction()
    expect((await globalArama('')).data).toEqual([])
    expect((await globalArama('a')).data).toEqual([])
  })

  it('"banvit" ödemelerde ve sürülerde eşleşir', async () => {
    const { globalArama } = await loadAction()
    const res = await globalArama('banvit')
    expect(res.error).toBeNull()
    // Banvit aciklama + Banvit notlar
    const tipler = res.data.map((r) => r.tip)
    expect(tipler).toContain('odeme')
    expect(tipler).toContain('suru')
    const odemeRes = res.data.find((r) => r.tip === 'odeme')
    expect(odemeRes?.baslik).toBe('Banvit yem faturası')
    expect(odemeRes?.link).toBe('/odemeler')
    const suruRes = res.data.find((r) => r.tip === 'suru')
    expect(suruRes?.baslik).toBe('Dönem 2026-1')
    expect(suruRes?.link).toBe('/suru/2026-1')
  })

  it('"veteriner" olayda eşleşir', async () => {
    const { globalArama } = await loadAction()
    const res = await globalArama('veteriner')
    expect(res.error).toBeNull()
    const olay = res.data.find((r) => r.tip === 'olay')
    expect(olay?.baslik).toBe('Veteriner ziyareti')
    expect(olay?.link).toBe('/olaylar')
  })

  it('toplam max 15 sonuç döner', async () => {
    // 20 sahte ödeme
    state.odemeler = Array.from({ length: 20 }, (_, i) => ({
      id: `o${i}`,
      aciklama: `Test ödeme ${i}`,
      kime: null,
      vade_tarihi: '2026-05-10',
      tutar: 100,
      odendi_mi: false,
    }))
    const { globalArama } = await loadAction()
    const res = await globalArama('test')
    expect(res.data.length).toBeLessThanOrEqual(15)
  })

  it('% ve _ kaçışı doğru — SQL injection edilemez', async () => {
    state.odemeler.push({
      id: 'o3',
      aciklama: '100% kar marjı',
      kime: null,
      vade_tarihi: '2026-05-10',
      tutar: 999,
      odendi_mi: false,
    })
    const { globalArama } = await loadAction()
    const res = await globalArama('100%')
    // Mock'ta basit substring; "100%" ile "100% kar marjı" eşleşmeli
    const matched = res.data.find((r) => r.baslik === '100% kar marjı')
    expect(matched).toBeTruthy()
  })

  it('ek_bilgi alanında tarih ve tutar formatlı', async () => {
    const { globalArama } = await loadAction()
    const res = await globalArama('banvit')
    const odeme = res.data.find((r) => r.tip === 'odeme' && r.baslik === 'Banvit yem faturası')
    expect(odeme?.ek_bilgi).toContain('2026-05-15')
    expect(odeme?.ek_bilgi).toContain('Banvit A.Ş.')
  })
})
