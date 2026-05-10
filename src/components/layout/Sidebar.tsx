'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Item = {
  href: string
  label: string
  icon: string
  matchPaths?: string[]
}

const items: Item[] = [
  { href: '/',          label: 'Dashboard', icon: '🏠', matchPaths: ['/'] },
  { href: '/odemeler',  label: 'Ödemeler',  icon: '💳' },
  { href: '/suru',      label: 'Sürü',      icon: '🐔' },
  { href: '/olaylar',   label: 'Olaylar',   icon: '📋' },
]

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
}

function isActive(pathname: string | null, href: string, matchPaths?: string[]) {
  if (!pathname) return false
  if (matchPaths) {
    if (matchPaths.includes(pathname)) return true
    return matchPaths.some((p) => p !== '/' && pathname.startsWith(p + '/'))
  }
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Sidebar({
  userName,
}: {
  userName: string
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile top bar (lg:hidden) */}
      <header className="lg:hidden sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-rule-soft">
        <div className="flex items-center h-14 px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-md hover:bg-surface-deep flex items-center justify-center text-xl"
            aria-label="Menüyü aç"
          >
            ☰
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center text-white font-bold text-xs shadow-sm">
              S
            </div>
            <span className="font-bold text-sm">Sarac</span>
          </Link>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop hover-expand 64→240, mobile drawer */}
      <aside
        className={`group fixed top-0 left-0 z-40 h-screen bg-card border-r border-rule-soft flex flex-col transition-all duration-200 ease-out
          lg:w-16 lg:hover:w-60 lg:hover:shadow-xl
          w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between border-b border-rule-soft flex-shrink-0 px-3 lg:px-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
              S
            </div>
            <span className="font-bold text-base tracking-tight truncate lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
              Sarac
            </span>
          </Link>
          <button
            className="lg:hidden w-8 h-8 rounded-md hover:bg-surface-deep flex items-center justify-center text-base"
            onClick={() => setMobileOpen(false)}
            aria-label="Menüyü kapat"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href, item.matchPaths)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-brand-soft text-brand-deep'
                    : 'text-ink-soft hover:text-ink hover:bg-surface-deep'
                }`}
              >
                <span className="text-lg flex-shrink-0 w-6 text-center">{item.icon}</span>
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* User card at bottom */}
        <div className="border-t border-rule-soft p-2 lg:p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              title={userName}
              className="w-9 h-9 rounded-full brand-gradient flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
            >
              {initials(userName)}
            </div>
            <div className="flex-1 min-w-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
              <p className="text-sm font-semibold truncate">{userName}</p>
            </div>
            <form
              action="/api/cikis"
              method="post"
              className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150"
            >
              <button
                type="submit"
                className="w-8 h-8 rounded-md text-ink-muted hover:text-danger hover:bg-danger-soft flex items-center justify-center transition-colors"
                title="Çıkış yap"
                aria-label="Çıkış yap"
              >
                ⎋
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
