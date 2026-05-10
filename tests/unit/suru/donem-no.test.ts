import { describe, it, expect } from 'vitest'
import { sonrakiDonemNo } from '@/lib/suru/donem-no'

describe('sonrakiDonemNo', () => {
  it('aynı yılda dönem yoksa "<yıl>-1" döner', () => {
    expect(sonrakiDonemNo([], 2026)).toBe('2026-1')
  })

  it('en yüksek sıraya 1 ekler', () => {
    expect(sonrakiDonemNo(['2026-1', '2026-2', '2026-3'], 2026)).toBe('2026-4')
  })

  it('farklı yıllı kayıtları görmezden gelir', () => {
    expect(sonrakiDonemNo(['2025-1', '2025-2', '2024-7'], 2026)).toBe('2026-1')
  })

  it('sıra dışı sıralama gelse bile maksimumu bulur', () => {
    expect(sonrakiDonemNo(['2026-3', '2026-1', '2026-2'], 2026)).toBe('2026-4')
  })

  it('beklenmeyen format kayıtları atar', () => {
    expect(sonrakiDonemNo(['2026-A', 'foo', '2026-2'], 2026)).toBe('2026-3')
  })

  it('aynı yılda 10+ dönem destekler', () => {
    const liste = Array.from({ length: 12 }, (_, i) => `2026-${i + 1}`)
    expect(sonrakiDonemNo(liste, 2026)).toBe('2026-13')
  })
})
