-- ============================================================================
-- 0005 — RLS politikaları
-- Politika: 2 kullanıcı eşit yetkili → auth.uid() IS NOT NULL → tam yetki.
-- audit_log: yalnız okuma (INSERT trigger'dan, UPDATE/DELETE yasak).
-- profiles: kendi kaydını okur+güncellr (rol değiştiremez — admin SQL ile).
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
alter table public.odeme_kategorileri enable row level security;
alter table public.odemeler enable row level security;
alter table public.odeme_tekrar_gruplari enable row level security;
alter table public.suru_donemleri enable row level security;
alter table public.suru_bloklari enable row level security;
alter table public.suru_tarti enable row level security;
alter table public.suru_olum enable row level security;
alter table public.suru_yem enable row level security;
alter table public.olay_kategorileri enable row level security;
alter table public.ciftlik_olaylari enable row level security;

-- Profiles
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- audit_log: salt-okunur (auth.uid() IS NOT NULL ile herkes görür)
create policy "audit_log_select_authenticated" on public.audit_log
  for select using (auth.uid() is not null);
-- INSERT/UPDATE/DELETE policy yok → trigger dışında erişim yok
-- (trigger SECURITY DEFINER olduğu için RLS bypass eder)

-- Tüm diğer tablolar: 2 kullanıcı eşit yetkili
-- Tek policy = FOR ALL (select+insert+update+delete)
create policy "odeme_kategorileri_all_authenticated" on public.odeme_kategorileri
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "odemeler_all_authenticated" on public.odemeler
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "odeme_tekrar_gruplari_all_authenticated" on public.odeme_tekrar_gruplari
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "suru_donemleri_all_authenticated" on public.suru_donemleri
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "suru_bloklari_all_authenticated" on public.suru_bloklari
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "suru_tarti_all_authenticated" on public.suru_tarti
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "suru_olum_all_authenticated" on public.suru_olum
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "suru_yem_all_authenticated" on public.suru_yem
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "olay_kategorileri_all_authenticated" on public.olay_kategorileri
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "ciftlik_olaylari_all_authenticated" on public.ciftlik_olaylari
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
