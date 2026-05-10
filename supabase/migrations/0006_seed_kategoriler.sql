-- ============================================================================
-- 0006 — Kategori seed verileri (spec §3.2 ve §3.4)
-- ============================================================================

-- Ödeme kategorileri (spec §3.2)
insert into public.odeme_kategorileri (isim, renk) values
  ('Çek',       '#6366f1'),  -- indigo
  ('Fatura',    '#f59e0b'),  -- amber
  ('Taksit',    '#8b5cf6')   -- mor
  on conflict (isim) do nothing;

-- Olay kategorileri (spec §3.4)
insert into public.olay_kategorileri (isim, renk) values
  ('Veteriner',         '#10b981'),  -- yeşil
  ('Elektrik-tamir',    '#f59e0b'),  -- amber
  ('Yem teslimat',      '#0ea5e9'),  -- mavi
  ('İlaç verme',        '#a855f7'),  -- mor
  ('Tartı',             '#6366f1'),  -- indigo
  ('Ölü tahliye',       '#ef4444'),  -- kırmızı
  ('Bakım',             '#14b8a6'),  -- teal
  ('Diğer ziyaretçi',   '#94a3b8'),  -- slate
  ('Diğer',             '#6b7280')   -- gri
  on conflict (isim) do nothing;
