-- ============================================================================
-- 0004 — Çiftlik olayları modülü (2 tablo)
-- ============================================================================

create table public.olay_kategorileri (
  id uuid primary key default gen_random_uuid(),
  isim text not null unique,
  renk text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table public.ciftlik_olaylari (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  kategori_id uuid references public.olay_kategorileri(id) on delete set null,
  baslik text not null,
  aciklama text,
  kisi_firma text,
  donem_id uuid references public.suru_donemleri(id) on delete set null,
  olusturan uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ciftlik_olaylari_tarih on public.ciftlik_olaylari(tarih desc);
create index idx_ciftlik_olaylari_kategori on public.ciftlik_olaylari(kategori_id);
create index idx_ciftlik_olaylari_donem on public.ciftlik_olaylari(donem_id);

create trigger trg_ciftlik_olaylari_updated_at
  before update on public.ciftlik_olaylari
  for each row execute function public.set_updated_at();

-- Audit trigger'ları
create trigger trg_audit_olay_kategorileri
  after insert or update or delete on public.olay_kategorileri
  for each row execute function public.audit_kayit();

create trigger trg_audit_ciftlik_olaylari
  after insert or update or delete on public.ciftlik_olaylari
  for each row execute function public.audit_kayit();
