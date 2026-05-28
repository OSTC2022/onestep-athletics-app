-- =============================================================================
-- 002_food_items.sql
-- 공식 식품영양성분 DB (MFDS CSV) — food_items / food_aliases
--
-- 실행 순서 (새 Supabase 프로젝트):
--   1) 001_external_food_cache.sql  — USDA 등 외부 API 캐시 전용
--   2) 002_food_items.sql           — 공식 CSV import 대상
--
-- import: npm run import:foods
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- food_items — 공식 음식 DB (scripts/import-foods.ts)
-- ---------------------------------------------------------------------------
create table if not exists food_items (
  id text primary key,
  official_code text not null unique,
  name_ko text not null,
  normalized_name text not null,
  name_en text,
  category text not null default '식품',
  representative_name text,
  data_type text not null default 'D',
  data_source text not null default 'mfds',
  serving_label text not null default '1회',
  piece_weight_g numeric not null default 100,
  serving_reference_raw text,
  food_weight_raw text,
  per100g jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_food_items_name_ko
  on food_items (name_ko);

create index if not exists idx_food_items_normalized_name
  on food_items (normalized_name);

create index if not exists idx_food_items_category
  on food_items (category);

create index if not exists idx_food_items_official_code
  on food_items (official_code);

-- ---------------------------------------------------------------------------
-- food_aliases — 검색용 별칭 (대표식품명, 단축명 등)
-- ---------------------------------------------------------------------------
create table if not exists food_aliases (
  id uuid primary key default gen_random_uuid(),
  food_item_id text not null references food_items (id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  alias_type text not null default 'alias',
  created_at timestamptz not null default now(),
  unique (food_item_id, normalized_alias)
);

create index if not exists idx_food_aliases_alias
  on food_aliases (alias);

create index if not exists idx_food_aliases_normalized_alias
  on food_aliases (normalized_alias);

create index if not exists idx_food_aliases_food_item_id
  on food_aliases (food_item_id);

-- service role 전용 (RLS 활성화, 정책 없음 → anon/authenticated 차단)
alter table food_items enable row level security;
alter table food_aliases enable row level security;
