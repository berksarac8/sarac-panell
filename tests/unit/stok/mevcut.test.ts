import { describe, it, expect } from 'vitest'
import { hesaplaMevcut, mevcutMap, type HareketRow } from '@/lib/stok/mevcut'

describe('hesaplaMevcut', () => {
  it('sadece giriş → toplam', () => {
    const hs: HareketRow[] = [
      { kalem_id: 'a', hareket_tipi: 'giris', miktar: 100 },
      { kalem_id: 'a', hareket_tipi: 'giris', miktar: 50 },
    ]
    expect(hesaplaMevcut('a', hs)).toBe(150)
  })

  it('giriş - çıkış', () => {
    const hs: HareketRow[] = [
      { kalem_id: 'a', hareket_tipi: 'giris', miktar: 100 },
      { kalem_id: 'a', hareket_tipi: 'cikis', miktar: 30 },
      { kalem_id: 'a', hareket_tipi: 'cikis', miktar: 20 },
    ]
    expect(hesaplaMevcut('a', hs)).toBe(50)
  })

  it('farklı kalem hareketlerini saymaz', () => {
    const hs: HareketRow[] = [
      { kalem_id: 'a', hareket_tipi: 'giris', miktar: 100 },
      { kalem_id: 'b', hareket_tipi: 'giris', miktar: 999 },
      { kalem_id: 'a', hareket_tipi: 'cikis', miktar: 25 },
    ]
    expect(hesaplaMevcut('a', hs)).toBe(75)
    expect(hesaplaMevcut('b', hs)).toBe(999)
  })

  it('string miktarı number\'a çevirir', () => {
    const hs: HareketRow[] = [
      { kalem_id: 'a', hareket_tipi: 'giris', miktar: '12.5' },
      { kalem_id: 'a', hareket_tipi: 'cikis', miktar: '2.5' },
    ]
    expect(hesaplaMevcut('a', hs)).toBe(10)
  })

  it('kayıt yoksa 0', () => {
    expect(hesaplaMevcut('a', [])).toBe(0)
  })

  it('negatif mevcut → eksi değer döner (çıkış girişten fazla)', () => {
    const hs: HareketRow[] = [
      { kalem_id: 'a', hareket_tipi: 'giris', miktar: 10 },
      { kalem_id: 'a', hareket_tipi: 'cikis', miktar: 30 },
    ]
    expect(hesaplaMevcut('a', hs)).toBe(-20)
  })
})

describe('mevcutMap', () => {
  it('birden çok kalem için map döner', () => {
    const hs: HareketRow[] = [
      { kalem_id: 'a', hareket_tipi: 'giris', miktar: 100 },
      { kalem_id: 'a', hareket_tipi: 'cikis', miktar: 25 },
      { kalem_id: 'b', hareket_tipi: 'giris', miktar: 50 },
    ]
    const m = mevcutMap(hs)
    expect(m.get('a')).toBe(75)
    expect(m.get('b')).toBe(50)
  })

  it('boş → boş map', () => {
    expect(mevcutMap([]).size).toBe(0)
  })
})
