import { describe, it, expect } from 'vitest'
import { filterOlaylar } from '@/lib/olaylar/filter'
import type { CiftlikOlay } from '@/types/olaylar'

const o = (over: Partial<CiftlikOlay>): CiftlikOlay => ({
  id: 'x',
  tarih: '2026-05-10',
  kategori_id: null,
  baslik: 't',
  aciklama: null,
  kisi_firma: null,
  donem_id: null,
  olusturan: 'u',
  created_at: '',
  updated_at: '',
  ...over,
})

describe('filterOlaylar', () => {
  it('boş filtre → hepsi', () => {
    const xs = [o({ id: 'a' }), o({ id: 'b' })]
    expect(filterOlaylar(xs, {})).toHaveLength(2)
  })

  it('kategori filter', () => {
    const xs = [o({ id: 'a', kategori_id: 'k1' }), o({ id: 'b', kategori_id: 'k2' })]
    expect(filterOlaylar(xs, { kategori_ids: ['k1'] })).toEqual([xs[0]])
  })

  it('arama (baslik / aciklama / kisi_firma)', () => {
    const xs = [
      o({ id: 'a', baslik: 'Veteriner geldi' }),
      o({ id: 'b', aciklama: 'sıcak çok' }),
      o({ id: 'c', kisi_firma: 'Aslanyem A.Ş.' }),
    ]
    expect(filterOlaylar(xs, { arama: 'aslan' }).map((x) => x.id)).toEqual(['c'])
    expect(filterOlaylar(xs, { arama: 'sıcak' }).map((x) => x.id)).toEqual(['b'])
  })

  it('tarih aralığı', () => {
    const xs = [
      o({ id: 'a', tarih: '2026-04-01' }),
      o({ id: 'b', tarih: '2026-05-15' }),
      o({ id: 'c', tarih: '2026-06-30' }),
    ]
    expect(
      filterOlaylar(xs, { tarih_baslangic: '2026-05-01', tarih_bitis: '2026-05-31' }).map(
        (x) => x.id
      )
    ).toEqual(['b'])
  })

  it('donem_id', () => {
    const xs = [o({ id: 'a', donem_id: 'd1' }), o({ id: 'b', donem_id: 'd2' })]
    expect(filterOlaylar(xs, { donem_id: 'd1' }).map((x) => x.id)).toEqual(['a'])
  })
})
