import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './Sidebar'

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
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
