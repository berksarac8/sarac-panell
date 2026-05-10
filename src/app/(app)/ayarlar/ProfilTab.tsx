'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfilAdSoyad } from '@/lib/actions/ayarlar'
import type { ProfilOzet } from '@/types/ayarlar'

export function ProfilTab({ profil }: { profil: ProfilOzet }) {
  const router = useRouter()
  const [adSoyad, setAdSoyad] = useState(profil.ad_soyad)
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function submit(formData: FormData) {
    setHata(null)
    setOk(false)
    formData.set('ad_soyad', adSoyad)
    startTransition(async () => {
      const res = await updateProfilAdSoyad(formData)
      if ('error' in res && res.error) {
        setHata(res.error)
        return
      }
      setOk(true)
      router.refresh()
    })
  }

  return (
    <div className="rounded-md border bg-card p-4 space-y-4">
      <h2 className="text-lg font-semibold">Profil Bilgileri</h2>

      <form action={submit} className="space-y-3 max-w-md">
        <Field label="E-posta">
          <input
            value={profil.email}
            readOnly
            disabled
            className="w-full border rounded px-2 py-1.5 text-sm bg-slate-50 text-slate-600"
          />
          <p className="text-xs text-muted-foreground mt-1">E-posta değiştirilemez.</p>
        </Field>

        <Field label="Rol">
          <input
            value={profil.rol}
            readOnly
            disabled
            className="w-full border rounded px-2 py-1.5 text-sm bg-slate-50 text-slate-600"
          />
        </Field>

        <Field label="Ad Soyad">
          <input
            required
            value={adSoyad}
            onChange={(e) => setAdSoyad(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
            minLength={2}
          />
        </Field>

        {hata && <p className="text-sm text-rose-600">{hata}</p>}
        {ok && <p className="text-sm text-emerald-700">Profil güncellendi.</p>}

        <button
          type="submit"
          disabled={pending || adSoyad.trim() === profil.ad_soyad}
          className="text-sm px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}
