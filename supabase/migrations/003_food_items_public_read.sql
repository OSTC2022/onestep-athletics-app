-- =============================================================================
-- 003_food_items_public_read.sql
-- food_items / food_aliases 공개 읽기 (anon key — 추천·검색 API)
-- service role 없이도 Vercel 등 배포 환경에서 SELECT 가능
-- =============================================================================

drop policy if exists "food_items_public_read" on food_items;
create policy "food_items_public_read"
  on food_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists "food_aliases_public_read" on food_aliases;
create policy "food_aliases_public_read"
  on food_aliases
  for select
  to anon, authenticated
  using (true);
