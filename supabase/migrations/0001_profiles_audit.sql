-- ============================================================================
-- 0001 — profiles + audit_log + audit trigger
-- ============================================================================

-- Profiles (auth.users uzantısı)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ad_soyad text not null,
  rol text not null default 'kullanici' check (rol in ('admin', 'kullanici')),
  created_at timestamptz not null default now()
);

-- Audit log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references auth.users(id) on delete set null,
  tablo text not null,
  kayit_id uuid,
  eylem text not null check (eylem in ('INSERT', 'UPDATE', 'DELETE')),
  eski_veri jsonb,
  yeni_veri jsonb,
  tarih timestamptz not null default now()
);

create index idx_audit_log_tablo_tarih on public.audit_log(tablo, tarih desc);
create index idx_audit_log_kullanici on public.audit_log(kullanici_id, tarih desc);

-- Yeni auth.users → profiles otomatik
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, ad_soyad, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'ad_soyad', new.email),
    coalesce(new.raw_user_meta_data->>'rol', 'kullanici')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Audit trigger fonksiyonu — her INSERT/UPDATE/DELETE'i audit_log'a yazar
-- ============================================================================
create or replace function public.audit_kayit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_kullanici uuid;
  v_kayit_id uuid;
  v_eski jsonb;
  v_yeni jsonb;
begin
  -- auth.uid() trigger içinde NULL olabilir (örn. tetikleyen sql api request'i değilse)
  v_kullanici := auth.uid();

  if (tg_op = 'DELETE') then
    v_kayit_id := (old.id)::uuid;
    v_eski := to_jsonb(old);
    v_yeni := null;
  elsif (tg_op = 'UPDATE') then
    v_kayit_id := (new.id)::uuid;
    v_eski := to_jsonb(old);
    v_yeni := to_jsonb(new);
  else  -- INSERT
    v_kayit_id := (new.id)::uuid;
    v_eski := null;
    v_yeni := to_jsonb(new);
  end if;

  insert into public.audit_log (kullanici_id, tablo, kayit_id, eylem, eski_veri, yeni_veri)
  values (v_kullanici, tg_table_name, v_kayit_id, tg_op, v_eski, v_yeni);

  if (tg_op = 'DELETE') then
    return old;
  else
    return new;
  end if;
end;
$$;

-- Bu fonksiyon Migration 0002, 0003, 0004'te her tabloya `attach` edilecek.
