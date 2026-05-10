import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './Sidebar'
import { BildirimDropdown } from './BildirimDropdown'
import { GlobalArama } from './GlobalArama'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const { data: profile } = await supabase
    .from('profiles')
    .select('ad_soyad')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar userName={profile?.ad_soyad ?? user.email ?? ''} />
      <div className="lg:ml-16 min-h-screen flex flex-col">
        {/* Sağ üst köşede arama + bildirimler (sidebar'a dokunmadan) */}
        <div className="fixed top-2 right-2 lg:top-3 lg:right-4 z-30 flex items-center gap-1 lg:gap-2">
          <GlobalArama />
          <BildirimDropdown />
        </div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
