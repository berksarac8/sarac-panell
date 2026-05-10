-- ============================================================================
-- 0008 — Banvit referans tablosu (sabit, gün 1-44)
-- ============================================================================

create table public.banvit_referans (
  gun_no smallint primary key check (gun_no >= 1 and gun_no <= 44),
  beklenen_su_ml numeric(8, 2) not null,
  beklenen_yem_gr numeric(8, 2) not null,
  beklenen_cumulative_gr numeric(10, 2) not null
);

-- Seed (Excel'den alındı)
insert into public.banvit_referans (gun_no, beklenen_su_ml, beklenen_yem_gr, beklenen_cumulative_gr) values
  (1, 28, 13, 57),
  (2, 32, 17, 73),
  (3, 40, 20, 91),
  (4, 48, 23, 111),
  (5, 52, 27, 134),
  (6, 58, 31, 160),
  (7, 62, 35, 189),
  (8, 76, 39, 220),
  (9, 84, 43, 256),
  (10, 94, 48, 294),
  (11, 102, 53, 336),
  (12, 114, 58, 381),
  (13, 122, 63, 429),
  (14, 132, 69, 480),
  (15, 146, 74, 535),
  (16, 156, 80, 593),
  (17, 166, 86, 665),
  (18, 178, 92, 719),
  (19, 190, 98, 786),
  (20, 202, 104, 856),
  (21, 214, 110, 929),
  (22, 228, 116, 1004),
  (23, 238, 122, 1082),
  (24, 250, 128, 1162),
  (25, 262, 134, 1224),
  (26, 272, 140, 1328),
  (27, 286, 146, 1414),
  (28, 296, 152, 1501),
  (29, 308, 157, 1590),
  (30, 318, 163, 1680),
  (31, 328, 168, 1771),
  (32, 340, 173, 1863),
  (33, 348, 178, 1956),
  (34, 356, 183, 2050),
  (35, 366, 187, 2144),
  (36, 376, 192, 2239),
  (37, 384, 196, 2334),
  (38, 392, 200, 2429),
  (39, 400, 204, 2524),
  (40, 406, 208, 2620),
  (41, 414, 211, 2715),
  (42, 420, 215, 2809),
  (43, 426, 218, 2904),
  (44, 430, 221, 2997);

alter table public.banvit_referans enable row level security;

create policy "banvit_referans_select_authenticated" on public.banvit_referans
  for select using (auth.uid() is not null);
-- INSERT/UPDATE/DELETE policy yok — sabit veri
