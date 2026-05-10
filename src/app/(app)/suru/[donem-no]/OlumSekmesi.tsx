'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteOlum } from '@/lib/actions/suru'
import { OlumDialog } from './OlumDialog'
import type { SuruOlum } from '@/types/suru'

export function OlumSekmesi({
  donemId,
  olumler,
}: {
  donemId: string
  olumler: SuruOlum[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function sil(id: string) {
    if (!confirm('Bu ölüm kaydını silmek istediğine emin misin?')) return
    startTransition(async () => {
      const res = await deleteOlum(id)
      if ('error' in res && res.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  const toplamAdet = olumler.reduce((s, o) => s + o.adet, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Toplam ölüm:{' '}
          <span className="font-mono font-medium text-foreground">
            {toplamAdet.toLocaleString('tr-TR')}
          </span>
        </div>
        <OlumDialog
          donemId={donemId}
          trigger={
            <button className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded">
              + Yeni Ölüm
            </button>
          }
        />
      </div>

      {olumler.length === 0 ? (
        <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu dönemde henüz ölüm kaydı yok.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Blok</th>
                <th className="px-3 py-2 text-right">Adet</th>
                <th className="px-3 py-2">Sebep</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {olumler.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">{o.tarih}</td>
                  <td className="px-3 py-2">
                    {o.blok_no == null ? 'Genel' : `Blok ${o.blok_no}`}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {o.adet.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{o.sebep ?? '—'}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <OlumDialog
                      donemId={donemId}
                      duzenle={o}
                      trigger={
                        <button className="text-xs text-indigo-600 hover:underline">
                          Düzenle
                        </button>
                      }
                    />
                    <button
                      onClick={() => sil(o.id)}
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
