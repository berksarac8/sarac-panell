-- ============================================================================
-- 0010 — Stok modülü (Yem / İlaç / Malzeme alımları)
-- ============================================================================

create table public.stok_kalemler (
  id uuid primary key default gen_random_uuid(),
  isim text not null,
  kategori text not null check (kategori in ('yem', 'ilac', 'malzeme', 'diger')),
  birim text not null default 'kg' check (birim in ('kg', 'litre', 'adet', 'paket')),
  notlar text,
  created_at timestamptz not null default now()
);

create table public.stok_hareketler (
  id uuid primary key default gen_random_uuid(),
  kalem_id uuid not null references public.stok_kalemler(id) on delete cascade,
  hareket_tipi text not null check (hareket_tipi in ('giris', 'cikis')),
  miktar numeric(12, 2) not null check (miktar > 0),
  birim_fiyat numeric(12, 2),
  tedarikci text,
  tarih date not null default current_date,
  donem_id uuid references public.suru_donemleri(id) on delete set null,
  notlar text,
  olusturan uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_stok_hareketler_kalem on public.stok_hareketler(kalem_id, tarih desc);
create index idx_stok_hareketler_donem on public.stok_hareketler(donem_id);

alter table public.stok_kalemler enable row level security;
alter table public.stok_hareketler enable row level security;

create policy "stok_kalemler_all_authenticated" on public.stok_kalemler
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "stok_hareketler_all_authenticated" on public.stok_hareketler
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

create trigger trg_audit_stok_kalemler
  after insert or update or delete on public.stok_kalemler
  for each row execute function public.audit_kayit();

create trigger trg_audit_stok_hareketler
  after insert or update or delete on public.stok_hareketler
  for each row execute function public.audit_kayit();
