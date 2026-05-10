-- ============================================================================
-- 0011 — in-app bildirimler
-- ============================================================================

create table public.bildirimler (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references public.profiles(id) on delete cascade,
  tip text not null check (tip in ('odeme_yaklasan', 'odeme_gecikmis', 'suru_kapanis_yaklasan', 'eksik_gun', 'sistem')),
  baslik text not null,
  mesaj text,
  link text,
  okundu_mu boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_bildirimler_kullanici on public.bildirimler(kullanici_id, okundu_mu, created_at desc);

alter table public.bildirimler enable row level security;

create policy "bildirimler_select_own" on public.bildirimler
  for select using (auth.uid() = kullanici_id);

create policy "bildirimler_update_own" on public.bildirimler
  for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);

create policy "bildirimler_insert_authenticated" on public.bildirimler
  for insert with check (auth.uid() is not null);

create policy "bildirimler_delete_own" on public.bildirimler
  for delete using (auth.uid() = kullanici_id);

create trigger trg_audit_bildirimler
  after insert or update or delete on public.bildirimler
  for each row execute function public.audit_kayit();
