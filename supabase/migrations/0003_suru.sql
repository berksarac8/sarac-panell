-- ============================================================================
-- 0003 — Sürü modülü (5 tablo) + kapanış trigger
-- ============================================================================

create table public.suru_donemleri (
  id uuid primary key default gen_random_uuid(),
  donem_no text not null unique,
  giris_tarihi date not null,
  durum text not null default 'aktif' check (durum in ('aktif', 'kapali')),
  notlar text,
  olusturan uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_suru_donemleri_durum on public.suru_donemleri(durum, giris_tarihi desc);

create table public.suru_bloklari (
  id uuid primary key default gen_random_uuid(),
  donem_id uuid not null references public.suru_donemleri(id) on delete cascade,
  blok_no smallint not null check (blok_no in (1, 2, 3)),
  giris_adedi integer not null check (giris_adedi >= 0),
  cikis_tarihi date,
  cikis_adedi integer check (cikis_adedi is null or cikis_adedi >= 0),
  cikis_kg numeric(10, 2) check (cikis_kg is null or cikis_kg >= 0),
  unique (donem_id, blok_no)
);

create index idx_suru_bloklari_donem on public.suru_bloklari(donem_id);

create table public.suru_tarti (
  id uuid primary key default gen_random_uuid(),
  donem_id uuid not null references public.suru_donemleri(id) on delete cascade,
  blok_no smallint check (blok_no is null or blok_no in (1, 2, 3)),
  tarih date not null,
  tartilan_adet integer not null check (tartilan_adet > 0),
  ortalama_kg numeric(8, 3) not null check (ortalama_kg > 0),
  created_at timestamptz not null default now()
);

create index idx_suru_tarti_donem_tarih on public.suru_tarti(donem_id, tarih desc);

create table public.suru_olum (
  id uuid primary key default gen_random_uuid(),
  donem_id uuid not null references public.suru_donemleri(id) on delete cascade,
  blok_no smallint check (blok_no is null or blok_no in (1, 2, 3)),
  tarih date not null,
  adet integer not null check (adet > 0),
  sebep text,
  created_at timestamptz not null default now()
);

create index idx_suru_olum_donem_tarih on public.suru_olum(donem_id, tarih desc);

create table public.suru_yem (
  id uuid primary key default gen_random_uuid(),
  donem_id uuid not null references public.suru_donemleri(id) on delete cascade,
  blok_no smallint check (blok_no is null or blok_no in (1, 2, 3)),
  tarih date not null,
  yem_kg numeric(10, 2) not null check (yem_kg > 0),
  yem_tipi text not null check (yem_tipi in ('baslatici', 'buyutme', 'bitirici')),
  created_at timestamptz not null default now()
);

create index idx_suru_yem_donem_tarih on public.suru_yem(donem_id, tarih desc);

-- ============================================================================
-- Sürü kapanış trigger: 3 blok da çıkış yaptıysa donem.durum = 'kapali'
-- ============================================================================
create or replace function public.suru_kapanisi_kontrol()
returns trigger
language plpgsql
as $$
declare
  v_acik_blok int;
  v_donem_id uuid;
begin
  v_donem_id := coalesce(new.donem_id, old.donem_id);

  select count(*) into v_acik_blok
  from public.suru_bloklari
  where donem_id = v_donem_id
    and cikis_tarihi is null;

  if v_acik_blok = 0 then
    update public.suru_donemleri
       set durum = 'kapali'
     where id = v_donem_id and durum = 'aktif';
  else
    update public.suru_donemleri
       set durum = 'aktif'
     where id = v_donem_id and durum = 'kapali';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_suru_bloklari_kapanis
  after insert or update or delete on public.suru_bloklari
  for each row execute function public.suru_kapanisi_kontrol();

-- Audit trigger'ları
create trigger trg_audit_suru_donemleri
  after insert or update or delete on public.suru_donemleri
  for each row execute function public.audit_kayit();

create trigger trg_audit_suru_bloklari
  after insert or update or delete on public.suru_bloklari
  for each row execute function public.audit_kayit();

create trigger trg_audit_suru_tarti
  after insert or update or delete on public.suru_tarti
  for each row execute function public.audit_kayit();

create trigger trg_audit_suru_olum
  after insert or update or delete on public.suru_olum
  for each row execute function public.audit_kayit();

create trigger trg_audit_suru_yem
  after insert or update or delete on public.suru_yem
  for each row execute function public.audit_kayit();
