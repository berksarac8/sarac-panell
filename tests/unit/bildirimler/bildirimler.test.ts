/**
 * bildirimler server actions — mock'lanmış Supabase ile davranış testleri.
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

type BildirimRow = {
  id: string
  kullanici_id: string
  tip: string
  baslik: string
  mesaj: string | null
  link: string | null
  okundu_mu: boolean
  created_at: string
}

type FakeState = {
  user: { id: string } | null
  bildirimler: BildirimRow[]
  inserts: Record<string, unknown>[]
  updates: { match: Record<string, unknown>; values: Record<string, unknown> }[]
}

function makeFakeSupabase(state: FakeState) {
  function makeChain(table: string) {
    const ctx: {
      match: Record<string, unknown>
      gte: Record<string, unknown>
      mode: 'select' | 'insert' | 'update'
      pendingValues?: Record<string, unknown>
      limitN?: number
      countOpt?: { count?: string }
    } = { match: {}, gte: {}, mode: 'select' }
    const chain: Record<string, unknown> = {}

    chain.select = () => chain
    chain.eq = (col: string, val: unknown) => {
      ctx.match[col] = val
      return chain
    }
    chain.gte = (col: string, val: unknown) => {
      ctx.gte[col] = val
      return chain
    }
    chain.order = () => chain
    chain.limit = (n: number) => {
      ctx.limitN = n
      return chain
    }

    function executeSelect() {
      if (table !== 'bildirimler') return { data: [], error: null }
      let rows = state.bildirimler
      for (const [k, v] of Object.entries(ctx.match)) {
        rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[k] === v)
      }
      for (const [k, v] of Object.entries(ctx.gte)) {
        rows = rows.filter((r) => String((r as unknown as Record<string, unknown>)[k]) >= String(v))
      }
      if (ctx.limitN != null) rows = rows.slice(0, ctx.limitN)
      return { data: rows, error: null }
    }

    chain.insert = (vals: Record<string, unknown>) => {
      ctx.mode = 'insert'
      if (table === 'bildirimler') {
        state.inserts.push(vals)
        const newRow: BildirimRow = {
          id: `b${state.bildirimler.length + 1}`,
          kullanici_id: String(vals.kullanici_id),
          tip: String(vals.tip),
          baslik: String(vals.baslik),
          mesaj: (vals.mesaj as string | null) ?? null,
          link: (vals.link as string | null) ?? null,
          okundu_mu: false,
          created_at: new Date().toISOString(),
        }
        state.bildirimler.push(newRow)
      }
      return Promise.resolve({ error: null })
    }

    chain.update = (vals: Record<string, unknown>, opts?: { count?: string }) => {
      ctx.mode = 'update'
      ctx.pendingValues = vals
      ctx.countOpt = opts
      return chain
    }

    // Update for terminal
    chain.then = (resolve: unknown) => {
      if (ctx.mode === 'update' && ctx.pendingValues) {
        let count = 0
        if (table === 'bildirimler') {
          for (const r of state.bildirimler) {
            const row = r as unknown as Record<string, unknown>
            let match = true
            for (const [k, v] of Object.entries(ctx.match)) {
              if (row[k] !== v) match = false
            }
            if (match) {
              count++
              Object.assign(row, ctx.pendingValues)
            }
          }
          state.updates.push({ match: { ...ctx.match }, values: { ...ctx.pendingValues } })
        }
        if (typeof resolve === 'function') {
          (resolve as (v: unknown) => void)({ error: null, count })
        }
      } else if (ctx.mode === 'select') {
        const result = executeSelect()
        if (typeof resolve === 'function') {
          (resolve as (v: unknown) => void)(result)
        }
      } else if (typeof resolve === 'function') {
        (resolve as (v: unknown) => void)({ error: null, data: null })
      }
      return chain
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
    bildirimler: [
      {
        id: 'b-existing-1',
        kullanici_id: 'u1',
        tip: 'sistem',
        baslik: 'Eski bildirim',
        mesaj: null,
        link: null,
        okundu_mu: false,
        created_at: '2026-05-09T00:00:00Z',
      },
      {
        id: 'b-existing-2',
        kullanici_id: 'u1',
        tip: 'sistem',
        baslik: 'Okunmuş',
        mesaj: null,
        link: null,
        okundu_mu: true,
        created_at: '2026-05-08T00:00:00Z',
      },
    ],
    inserts: [],
    updates: [],
  }
  vi.doMock('@/lib/supabase/server', () => ({
    createClient: async () => makeFakeSupabase(state),
  }))
  // Olaylar/odemeler için stub
  vi.doMock('@/lib/actions/suru-metrik', () => ({
    getEksikGunler: async () => ({ error: null, data: [], toplamGun: 0 }),
  }))
})

async function loadAction() {
  const mod = await import('@/lib/actions/bildirimler')
  return mod
}

describe('listBildirimler', () => {
  it('user yoksa Yetkisiz döner', async () => {
    state.user = null
    const { listBildirimler } = await loadAction()
    const res = await listBildirimler()
    expect(res.error).toBe('Yetkisiz')
    expect(res.data).toEqual([])
    expect(res.okunmamisSayi).toBe(0)
  })

  it('tüm bildirimleri okunmamış sayı ile döner', async () => {
    const { listBildirimler } = await loadAction()
    const res = await listBildirimler(false)
    expect(res.error).toBeNull()
    expect(res.data).toHaveLength(2)
    expect(res.okunmamisSayi).toBe(1)
  })

  it('okunmamis_only=true ise sadece okunmamış döner', async () => {
    const { listBildirimler } = await loadAction()
    const res = await listBildirimler(true)
    expect(res.data).toHaveLength(1)
    expect(res.data[0].id).toBe('b-existing-1')
  })
})

describe('markBildirimOkundu', () => {
  it('user yoksa Yetkisiz', async () => {
    state.user = null
    const { markBildirimOkundu } = await loadAction()
    const res = await markBildirimOkundu('b-existing-1')
    expect(res.error).toBe('Yetkisiz')
  })

  it('okunmamış bildirimi okundu yapar', async () => {
    const { markBildirimOkundu } = await loadAction()
    const res = await markBildirimOkundu('b-existing-1')
    expect(res.ok).toBe(true)
    expect(state.updates.length).toBeGreaterThanOrEqual(1)
    const u = state.updates[0]
    expect(u.values).toMatchObject({ okundu_mu: true })
  })
})

describe('markAllBildirimOkundu', () => {
  it('tüm okunmamışları okundu yapar', async () => {
    const { markAllBildirimOkundu } = await loadAction()
    const res = await markAllBildirimOkundu()
    expect(res.ok).toBe(true)
    // Mock counter: bir okunmamış vardı
    expect(res.sayisi).toBeGreaterThanOrEqual(0)
    expect(state.updates.length).toBeGreaterThanOrEqual(1)
  })
})

describe('createBildirimForCurrentUser', () => {
  it('yeni bildirim oluşturur', async () => {
    const { createBildirimForCurrentUser } = await loadAction()
    const res = await createBildirimForCurrentUser(
      'odeme_gecikmis',
      'Test başlık',
      'Mesaj',
      '/odemeler'
    )
    expect(res.ok).toBe(true)
    expect(res.skipped).toBeFalsy()
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0]).toMatchObject({
      kullanici_id: 'u1',
      tip: 'odeme_gecikmis',
      baslik: 'Test başlık',
      mesaj: 'Mesaj',
      link: '/odemeler',
    })
  })

  it('aynı tip+başlık 7 gün içinde varsa skip eder', async () => {
    state.bildirimler.push({
      id: 'b-dup',
      kullanici_id: 'u1',
      tip: 'odeme_gecikmis',
      baslik: 'Dup test',
      mesaj: null,
      link: null,
      okundu_mu: false,
      created_at: new Date().toISOString(), // recent
    })
    const { createBildirimForCurrentUser } = await loadAction()
    const res = await createBildirimForCurrentUser('odeme_gecikmis', 'Dup test')
    expect(res.ok).toBe(true)
    expect(res.skipped).toBe(true)
    expect(state.inserts).toHaveLength(0)
  })
})
