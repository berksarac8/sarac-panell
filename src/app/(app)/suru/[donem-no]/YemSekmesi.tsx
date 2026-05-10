'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteYem } from '@/lib/actions/suru'
import { YemDialog } from './YemDialog'
import { YEM_TIPI_LABEL } from '@/types/suru'
import type { SuruYem } from '@/types/suru'

export function YemSekmesi({ donemId, yemler }: { donemId: string; yemler: SuruYem[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function sil(id: string) {
    if (!confirm('Bu yem kaydını silmek istediğine emin misin?')) return
    startTransition(async () => {
      const res = await deleteYem(id)
      if (res.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  const toplamKg = yemler.reduce((s, y) => s + Number(y.yem_kg), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Toplam yem:{' '}
          <span className="font-mono font-medium text-foreground">
            {toplamKg.toLocaleString('tr-TR')} kg
          </span>
        </div>
        <YemDialog
          donemId={donemId}
          trigger={
            <button className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded">
              + Yeni Yem Kaydı
            </button>
          }
        />
      </div>

      {yemler.length === 0 ? (
        <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu dönemde henüz yem kaydı yok.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Blok</th>
                <th className="px-3 py-2 text-right">Kg</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {yemler.map((y) => (
                <tr key={y.id} className="border-t">
                  <td className="px-3 py-2">{y.tarih}</td>
                  <td className="px-3 py-2">
                    {y.blok_no == null ? 'Genel' : `Blok ${y.blok_no}`}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {Number(y.yem_kg).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2">{YEM_TIPI_LABEL[y.yem_tipi]}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <YemDialog
                      donemId={donemId}
                      duzenle={y}
                      trigger={
                        <button className="text-xs text-indigo-600 hover:underline">
                          Düzenle
                        </button>
                      }
                    />
                    <button
                      onClick={() => sil(y.id)}
                      disabled={pending}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
