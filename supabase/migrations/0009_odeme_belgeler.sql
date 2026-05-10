-- ============================================================================
-- 0009 — Ödeme belgeleri (fatura/çek/sözleşme fotoğrafları)
-- Storage: `belgeler` bucket (Supabase Dashboard'dan elle oluşturulmalı)
--   - private (public: false)
--   - file size limit: 10MB
--   - dosya yolu: odemeler/{odeme_id}/{uuid}-{dosya_adi}
-- ============================================================================

create table public.odeme_belgeler (
  id uuid primary key default gen_random_uuid(),
  odeme_id uuid not null references public.odemeler(id) on delete cascade,
  dosya_adi text not null,
  storage_path text not null,
  mime_type text,
  boyut integer not null check (boyut >= 0),
  yukleyen uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_odeme_belgeler_odeme on public.odeme_belgeler(odeme_id);

create trigger trg_audit_odeme_belgeler
  after insert or update or delete on public.odeme_belgeler
  for each row execute function public.audit_kayit();

alter table public.odeme_belgeler enable row level security;

create policy "odeme_belgeler_all_authenticated" on public.odeme_belgeler
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ============================================================================
-- Storage bucket politikaları (bucket Dashboard'dan oluşturulduktan sonra
-- aşağıdaki politikalar `storage.objects` üzerinde otomatik çalışacaktır.)
-- ============================================================================

create policy "belgeler_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'belgeler' and auth.uid() is not null);

create policy "belgeler_insert_authenticated"
  on storage.objects for insert
  with check (bucket_id = 'belgeler' and auth.uid() is not null);

create policy "belgeler_update_authenticated"
  on storage.objects for update
  using (bucket_id = 'belgeler' and auth.uid() is not null);

create policy "belgeler_delete_authenticated"
  on storage.objects for delete
  using (bucket_id = 'belgeler' and auth.uid() is not null);
