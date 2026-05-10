-- ============================================================================
-- 0002 — Ödeme modülü (3 tablo)
-- ============================================================================

create table public.odeme_kategorileri (
  id uuid primary key default gen_random_uuid(),
  isim text not null unique,
  renk text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table public.odeme_tekrar_gruplari (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  periyot text not null check (periyot in ('haftalik', 'aylik', 'yillik')),
  tekrar_sayisi integer not null check (tekrar_sayisi > 0),
  olusturan uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.odemeler (
  id uuid primary key default gen_random_uuid(),
  aciklama text not null,
  kategori_id uuid references public.odeme_kategorileri(id) on delete set null,
  tutar numeric(14, 2) not null,
  vade_tarihi date not null,
  kime text,
  notlar text,
  odendi_mi boolean not null default false,
  odeme_tarihi date,
  tekrar_grubu_id uuid references public.odeme_tekrar_gruplari(id) on delete set null,
  olusturan uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_odemeler_vade on public.odemeler(vade_tarihi);
create index idx_odemeler_odendi on public.odemeler(odendi_mi, vade_tarihi);
create index idx_odemeler_kategori on public.odemeler(kategori_id);
create index idx_odemeler_grup on public.odemeler(tekrar_grubu_id);

-- updated_at otomatik
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_odemeler_updated_at
  before update on public.odemeler
  for each row execute function public.set_updated_at();

-- Audit trigger'ları
create trigger trg_audit_odeme_kategorileri
  after insert or update or delete on public.odeme_kategorileri
  for each row execute function public.audit_kayit();

create trigger trg_audit_odemeler
  after insert or update or delete on public.odemeler
  for each row execute function public.audit_kayit();

create trigger trg_audit_odeme_tekrar_gruplari
  after insert or update or delete on public.odeme_tekrar_gruplari
  for each row execute function public.audit_kayit();
