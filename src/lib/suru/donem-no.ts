/**
 * Mevcut dönem numaralarına göre, verilen yıl için bir sonraki dönem numarasını üretir.
 * Format: '<yıl>-<sıra>' (örn '2026-1', '2026-2').
 *
 * - Yıl filtresine uymayan kayıtlar yok sayılır.
 * - Beklenmeyen format ('2026-A', 'foo') kayıtları atılır.
 */
export function sonrakiDonemNo(mevcutNoLar: string[], yil: number): string {
  const yilPrefix = `${yil}-`
  let max = 0
  for (const no of mevcutNoLar) {
    if (!no.startsWith(yilPrefix)) continue
    const sira = Number(no.slice(yilPrefix.length))
    if (!Number.isInteger(sira) || sira < 1) continue
    if (sira > max) max = sira
  }
  return `${yil}-${max + 1}`
}
