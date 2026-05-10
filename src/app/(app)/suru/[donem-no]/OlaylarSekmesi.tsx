import Link from 'next/link'
import { listOlaylar } from '@/lib/actions/olaylar'

export async function OlaylarSekmesi({ donemId }: { donemId: string }) {
  const { error, data } = await listOlaylar({ donem_id: donemId })

  if (error) {
    return (
      <div className="rounded border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">
        Hata: {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href="/olaylar"
          className="text-sm px-3 py-1.5 border rounded text-indigo-700 hover:bg-indigo-50"
        >
          Olay eklemek için Olaylar sayfasına git →
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu döneme bağlı olay yok.
          <div className="mt-2 text-xs">
            Olay eklerken &quot;Bağlı sürü dönemi&quot; alanını bu döneme set et.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((o) => (
            <div key={o.id} className="rounded border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {o.tarih}
                    </span>
                    {o.kategori && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border"
                        style={{
                          borderColor: o.kategori.renk,
                          color: o.kategori.renk,
                        }}
                      >
                        {o.kategori.isim}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium">{o.baslik}</div>
                  {o.aciklama && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {o.aciklama}
                    </div>
                  )}
                  {o.kisi_firma && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Kişi/Firma: {o.kisi_firma}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
