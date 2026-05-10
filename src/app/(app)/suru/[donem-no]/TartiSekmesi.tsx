'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTarti } from '@/lib/actions/suru'
import { TartiDialog } from './TartiDialog'
import type { SuruTarti } from '@/types/suru'

export function TartiSekmesi({
  donemId,
  tartilar,
}: {
  donemId: string
  tartilar: SuruTarti[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function sil(id: string) {
    if (!confirm('Bu tartı kaydını silmek istediğine emin misin?')) return
    startTransition(async () => {
      const res = await deleteTarti(id)
      if ('error' in res && res.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TartiDialog
          donemId={donemId}
          trigger={
            <button className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded">
              + Yeni Tartı
            </button>
          }
        />
      </div>

      {tartilar.length === 0 ? (
        <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu dönemde henüz tartı kaydı yok.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Blok</th>
                <th className="px-3 py-2 text-right">Tartılan adet</th>
                <th className="px-3 py-2 text-right">Ortalama kg</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tartilar.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{t.tarih}</td>
                  <td className="px-3 py-2">
                    {t.blok_no == null ? 'Genel' : `Blok ${t.blok_no}`}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {t.tartilan_adet.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {t.ortalama_kg.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <TartiDialog
                      donemId={donemId}
                      duzenle={t}
                      trigger={
                        <button className="text-xs text-indigo-600 hover:underline">
                          Düzenle
                        </button>
                      }
                    />
                    <button
                      onClick={() => sil(t.id)}
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
