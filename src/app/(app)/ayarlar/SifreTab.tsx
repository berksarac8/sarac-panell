'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SifreTab() {
  const [mevcut, setMevcut] = useState('')
  const [yeni, setYeni] = useState('')
  const [yeniTekrar, setYeniTekrar] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setHata(null)
    setOk(false)

    if (yeni.length < 8) {
      setHata('Yeni şifre en az 8 karakter olmalı.')
      return
    }
    if (yeni !== yeniTekrar) {
      setHata('Yeni şifre tekrarı eşleşmiyor.')
      return
    }
    if (yeni === mevcut) {
      setHata('Yeni şifre eskisiyle aynı olamaz.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Mevcut şifreyi doğrula: kullanıcı email ile yeniden giriş yap.
    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email
    if (!email) {
      setHata('Oturum bulunamadı, tekrar giriş yapın.')
      setLoading(false)
      return
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: mevcut,
    })
    if (signErr) {
      setHata('Mevcut şifre yanlış.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: yeni })
    setLoading(false)
    if (error) {
      setHata(error.message)
      return
    }

    setOk(true)
    setMevcut('')
    setYeni('')
    setYeniTekrar('')
  }

  return (
    <div className="rounded-md border bg-card p-4 space-y-4">
      <h2 className="text-lg font-semibold">Şifre Değiştir</h2>
      <p className="text-sm text-muted-foreground">
        Şifren en az 8 karakter olmalı. Değiştirdikten sonra mevcut oturumun geçerli kalır.
      </p>

      <form onSubmit={submit} className="space-y-3 max-w-md">
        <Field label="Mevcut şifre">
          <input
            required
            type="password"
            autoComplete="current-password"
            value={mevcut}
            onChange={(e) => setMevcut(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </Field>

        <Field label="Yeni şifre">
          <input
            required
            type="password"
            autoComplete="new-password"
            value={yeni}
            onChange={(e) => setYeni(e.target.value)}
            minLength={8}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </Field>

        <Field label="Yeni şifre (tekrar)">
          <input
            required
            type="password"
            autoComplete="new-password"
            value={yeniTekrar}
            onChange={(e) => setYeniTekrar(e.target.value)}
            minLength={8}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </Field>

        {hata && <p className="text-sm text-rose-600">{hata}</p>}
        {ok && <p className="text-sm text-emerald-700">Şifre güncellendi.</p>}

        <button
          type="submit"
          disabled={loading}
          className="text-sm px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Güncelleniyor…' : 'Şifreyi Değiştir'}
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
