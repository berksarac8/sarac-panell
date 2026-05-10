'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Hatalı e-posta veya şifre.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="field-label">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@saractavukculuk.com"
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="field-input"
        />
      </div>

      {error && (
        <div className="rounded-md bg-danger-soft border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <span aria-hidden>⚠</span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-deep text-white py-2.5 rounded-md font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
      >
        {loading ? 'Giriş yapılıyor…' : 'Giriş yap →'}
      </button>
    </form>
  )
}
