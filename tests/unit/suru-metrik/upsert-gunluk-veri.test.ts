/**
 * upsertGunlukVeri server action — mock'lanmış Supabase ile davranış testleri.
 *
 * Test stratejisi: 'next/cache' ve 'next/headers' modüllerini mockluyoruz,
 * `createClient` çağrısını da fake bir Supabase istemcisiyle değiştiriyoruz.
 * Böylece server action'ın validasyon + upsert mantığı (select-then-update-or-insert)
 * sınanabilir.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/headers & next/cache mock'ları (modül seviyesi — server action import'undan önce)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}))

// --- Fake Supabase Builder ------------------------------------------------

type TableState = {
  /** İlk select sonucu (maybeSingle) için döndürülecek mevcut kayıt */
  mevcut?: { id: string } | null
  /** Insert / update'i takip için */
  inserts: Record<string, unknown>[]
  updates: { match: Record<string, unknown>; values: Record<string, unknown> }[]
}

type FakeState = {
  user: { id: string } | null
  tables: Record<string, TableState>
  /** suru_donemleri.maybeSingle için (girisTarihiAl) */
  donem?: { id: string; donem_no: string; giris_tarihi: string } | null
}

function makeFakeSupabase(state: FakeState) {
  function makeChain(table: string) {
    const ctx: { match: Record<string, unknown>; pendingValues?: Record<string, unknown>; mode: 'select' | 'insert' | 'update' | 'delete' } = {
      match: {},
      mode: 'select',
    }
    const chain: Record<string, unknown> = {}

    function applyMatch(col: string, val: unknown) {
      ctx.match[col] = val
      return chain
    }

    chain.select = () => chain
    chain.eq = (col: string, val: unknown) => applyMatch(col, val)
    chain.or = () => chain
    chain.order = () => chain
    chain.limit = () => chain

    chain.insert = (vals: Record<string, unknown> | Record<string, unknown>[]) => {
      ctx.mode = 'insert'
      const ts = state.tables[table] ?? (state.tables[table] = { inserts: [], updates: [] })
      if (Array.isArray(vals)) ts.inserts.push(...vals)
      else ts.inserts.push(vals)
      return Promise.resolve({ error: null })
    }
    chain.update = (vals: Record<string, unknown>) => {
      ctx.mode = 'update'
      ctx.pendingValues = vals
      return chain
    }
    chain.delete = () => {
      ctx.mode = 'delete'
      return chain
    }
    chain.maybeSingle = async () => {
      if (table === 'suru_donemleri') {
        return { data: state.donem ?? null, error: null }
      }
      const ts = state.tables[table]
      return { data: ts?.mevcut ?? null, error: null }
    }
    chain.single = async () => {
      if (ctx.mode === 'update' && ctx.pendingValues) {
        const ts = state.tables[table] ?? (state.tables[table] = { inserts: [], updates: [] })
        ts.updates.push({ match: { ...ctx.match }, values: ctx.pendingValues })
        return { data: { id: 'x' }, error: null }
      }
      return { data: null, error: null }
    }
    // update sonrası eq().eq() zinciri sonunda await olduğunda execute olmalı
    // Tail Promise: chain'i thenable gibi davrandır (eq sonu)
    chain.then = (resolve: unknown) => {
      if (ctx.mode === 'update' && ctx.pendingValues) {
        const ts = state.tables[table] ?? (state.tables[table] = { inserts: [], updates: [] })
        ts.updates.push({ match: { ...ctx.match }, values: ctx.pendingValues })
      }
      if (typeof resolve === 'function') {
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

// --- Test setup -----------------------------------------------------------

let state: FakeState

beforeEach(() => {
  state = {
    user: { id: 'user-1' },
    tables: {
      suru_su: { inserts: [], updates: [] },
      suru_olum: { inserts: [], updates: [] },
    },
    donem: {
      id: 'd1',
      donem_no: '2026-1',
      giris_tarihi: '2026-05-01',
    },
  }
  vi.doMock('@/lib/supabase/server', () => ({
    createClient: async () => makeFakeSupabase(state),
  }))
})

async function loadAction() {
  // Modülü mock'lardan sonra dinamik import et
  const mod = await import('@/lib/actions/suru-metrik')
  return mod
}

describe('upsertGunlukVeri', () => {
  it('user yoksa Yetkisiz döner', async () => {
    state.user = null
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-05-05', 100, null)
    expect(res.error).toBe('Yetkisiz')
  })

  it('hem su hem ölüm boşsa hata döner', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-05-05', null, null)
    expect(res.error).toMatch(/En az bir alan/i)
  })

  it('geçersiz blok hatası verir', async () => {
    const { upsertGunlukVeri } = await loadAction()
    // @ts-expect-error — kasıtlı yanlış input
    const res = await upsertGunlukVeri('d1', 5, '2026-05-05', 100, null)
    expect(res.error).toMatch(/Geçersiz blok/)
  })

  it('su girilirse ama gün > 44 ise hata verir', async () => {
    const { upsertGunlukVeri } = await loadAction()
    // giris 2026-05-01, 60 gün sonra = gün 61
    const res = await upsertGunlukVeri('d1', 1, '2026-06-30', 100, null)
    expect(res.error).toMatch(/gün > 44/)
  })

  it('su girilirse ama gün < 1 ise hata verir', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-04-30', 100, null)
    expect(res.error).toMatch(/giriş tarihinden önce/)
  })

  it('negatif su litre hatası', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-05-05', -10, null)
    expect(res.error).toMatch(/Su litre geçersiz/)
  })

  it('ondalıklı ölüm adedi reddedilir', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-05-05', null, 3.5)
    expect(res.error).toMatch(/Ölüm adedi geçersiz/)
  })

  it('sadece su girilirse: suru_su insert + suru_olum dokunulmaz', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-05-05', 1200, null)
    expect(res.ok).toBe(true)
    expect(res.yapildi?.su).toBe('insert')
    expect(res.yapildi?.olum).toBe(null)
    expect(state.tables.suru_su.inserts).toHaveLength(1)
    expect(state.tables.suru_su.inserts[0]).toMatchObject({
      donem_id: 'd1',
      blok_no: 1,
      tarih: '2026-05-05',
      su_litre: 1200,
    })
    expect(state.tables.suru_olum.inserts).toHaveLength(0)
    expect(state.tables.suru_olum.updates).toHaveLength(0)
  })

  it('mevcut su kaydı varsa update (insert değil)', async () => {
    state.tables.suru_su.mevcut = { id: 'su-existing' }
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-05-05', 1500, null)
    expect(res.ok).toBe(true)
    expect(res.yapildi?.su).toBe('update')
    expect(state.tables.suru_su.inserts).toHaveLength(0)
    expect(state.tables.suru_su.updates).toHaveLength(1)
    expect(state.tables.suru_su.updates[0].values).toMatchObject({ su_litre: 1500 })
  })

  it('sadece ölüm girilirse: suru_olum insert + suru_su dokunulmaz', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 2, '2026-05-05', null, 7, 'ezilme')
    expect(res.ok).toBe(true)
    expect(res.yapildi?.olum).toBe('insert')
    expect(res.yapildi?.su).toBe(null)
    expect(state.tables.suru_olum.inserts).toHaveLength(1)
    expect(state.tables.suru_olum.inserts[0]).toMatchObject({
      donem_id: 'd1',
      blok_no: 2,
      tarih: '2026-05-05',
      adet: 7,
      sebep: 'ezilme',
    })
    expect(state.tables.suru_su.inserts).toHaveLength(0)
  })

  it('mevcut ölüm kaydı varsa update', async () => {
    state.tables.suru_olum.mevcut = { id: 'olum-existing' }
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 2, '2026-05-05', null, 12, 'hastalık')
    expect(res.ok).toBe(true)
    expect(res.yapildi?.olum).toBe('update')
    expect(state.tables.suru_olum.updates).toHaveLength(1)
    expect(state.tables.suru_olum.updates[0].values).toMatchObject({
      adet: 12,
      sebep: 'hastalık',
    })
  })

  it('hem su hem ölüm girilirse ikisi de upsertlenir', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 3, '2026-05-10', 1800, 4)
    expect(res.ok).toBe(true)
    expect(res.yapildi?.su).toBe('insert')
    expect(res.yapildi?.olum).toBe('insert')
    expect(state.tables.suru_su.inserts).toHaveLength(1)
    expect(state.tables.suru_olum.inserts).toHaveLength(1)
  })

  it('bos sebep null olarak kaydedilir', async () => {
    const { upsertGunlukVeri } = await loadAction()
    await upsertGunlukVeri('d1', 1, '2026-05-05', null, 2, '   ')
    expect(state.tables.suru_olum.inserts[0]).toMatchObject({ sebep: null })
  })

  it('ölüm 0 kabul edilir (kayıt eksiklik girmemiş olabilir)', async () => {
    const { upsertGunlukVeri } = await loadAction()
    const res = await upsertGunlukVeri('d1', 1, '2026-05-05', null, 0)
    expect(res.ok).toBe(true)
    expect(state.tables.suru_olum.inserts[0]).toMatchObject({ adet: 0 })
  })
})
