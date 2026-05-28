-- =============================================================================
-- food_items 영양 데이터 품질 검증 쿼리
-- Supabase SQL Editor에서 실행
-- =============================================================================

-- 1) 피자 중 탄수/지방이 0 또는 null인 음식
SELECT
  id,
  name_ko,
  category,
  per100g->>'calories' AS calories,
  per100g->>'carbsG' AS carbs_g,
  per100g->>'proteinG' AS protein_g,
  per100g->>'fatG' AS fat_g,
  per100g->>'sodiumMg' AS sodium_mg
FROM food_items
WHERE name_ko ILIKE '%피자%'
  AND (
    (per100g->>'carbsG') IS NULL
    OR (per100g->>'carbsG')::numeric = 0
    OR (per100g->>'fatG') IS NULL
    OR (per100g->>'fatG')::numeric = 0
  )
ORDER BY (per100g->>'calories')::numeric DESC NULLS LAST
LIMIT 100;

-- 2) 칼로리는 높은데 탄수·지방이 0 또는 null
SELECT
  id,
  name_ko,
  category,
  per100g->>'calories' AS calories,
  per100g->>'carbsG' AS carbs_g,
  per100g->>'fatG' AS fat_g,
  per100g->>'proteinG' AS protein_g
FROM food_items
WHERE COALESCE((per100g->>'calories')::numeric, 0) > 150
  AND (
    (per100g->>'carbsG') IS NULL OR (per100g->>'carbsG')::numeric = 0
  )
  AND (
    (per100g->>'fatG') IS NULL OR (per100g->>'fatG')::numeric = 0
  )
ORDER BY (per100g->>'calories')::numeric DESC
LIMIT 200;

-- 3) macroCalories(탄*4+단*4+지*9)와 calories 차이가 큰 음식
SELECT
  id,
  name_ko,
  (per100g->>'calories')::numeric AS calories,
  (
    COALESCE((per100g->>'carbsG')::numeric, 0) * 4
    + COALESCE((per100g->>'proteinG')::numeric, 0) * 4
    + COALESCE((per100g->>'fatG')::numeric, 0) * 9
  ) AS macro_calories,
  ABS(
    COALESCE((per100g->>'calories')::numeric, 0)
    - (
      COALESCE((per100g->>'carbsG')::numeric, 0) * 4
      + COALESCE((per100g->>'proteinG')::numeric, 0) * 4
      + COALESCE((per100g->>'fatG')::numeric, 0) * 9
    )
  ) AS calorie_gap
FROM food_items
WHERE COALESCE((per100g->>'calories')::numeric, 0) >= 200
ORDER BY calorie_gap DESC
LIMIT 200;

-- 4) name_ko에 피자 포함 — nutrients JSON 전체 확인
SELECT id, name_ko, category, per100g
FROM food_items
WHERE name_ko ILIKE '%피자%'
ORDER BY name_ko
LIMIT 50;

-- 5) 의심 데이터 개수 요약
SELECT
  COUNT(*) FILTER (
    WHERE COALESCE((per100g->>'calories')::numeric, 0) > 150
      AND COALESCE((per100g->>'carbsG')::numeric, 0) = 0
      AND COALESCE((per100g->>'fatG')::numeric, 0) = 0
  ) AS high_kcal_zero_carb_fat,
  COUNT(*) FILTER (
    WHERE name_ko ~* '피자|치킨|케이크|디저트|라면|버거|튀김'
      AND COALESCE((per100g->>'carbsG')::numeric, 0) = 0
  ) AS indulgent_zero_carbs,
  COUNT(*) AS total
FROM food_items;
