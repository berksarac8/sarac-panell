-- ============================================================================
-- 0007 — Sürü günlük su tüketimi (Excel E sütunu) — blok bazlı, gün 1-44
-- ============================================================================

create table public.suru_su (
  id uuid primary key default gen_random_uuid(),
  donem_id uuid not null references public.suru_donemleri(id) on delete cascade,
  blok_no smallint not null check (blok_no in (1, 2, 3)),
  tarih date not null,
  gun_no smallint not null check (gun_no >= 1 and gun_no <= 44),
  su_litre numeric(10, 2) not null check (su_litre >= 0),
  created_at timestamptz not null default now(),
  unique (donem_id, blok_no, gun_no)
);

create index idx_suru_su_donem_blok on public.suru_su(donem_id, blok_no, gun_no);

create trigger trg_audit_suru_su
  after insert or update or delete on public.suru_su
  for each row execute function public.audit_kayit();

alter table public.suru_su enable row level security;

create policy "suru_su_all_authenticated" on public.suru_su
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
