-- =============================================================================
-- 001_external_food_cache.sql
-- USDA 등 외부 API 검색 결과 캐시 전용 (공식 CSV와 분리)
--
-- 실행 순서: 001 → 002_food_items.sql
-- =============================================================================
create extension if not exists "pgcrypto";

create table if not exists external_food_cache (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  aliases text[] not null default '{}',
  category text not null default '식사',
  search_keys text[] not null default '{}',
  per100g jsonb not null,
  source text not null default 'usda',
  external_id text,
  serving_label text default '1회',
  piece_weight_g numeric default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_external_food_cache_name
  on external_food_cache (name);

create index if not exists idx_external_food_cache_external_id
  on external_food_cache (external_id)
  where external_id is not null;

create index if not exists idx_external_food_cache_search_keys
  on external_food_cache using gin (search_keys);

create index if not exists idx_external_food_cache_last_used
  on external_food_cache (last_used_at desc);
