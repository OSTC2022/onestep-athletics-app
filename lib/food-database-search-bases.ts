type N = {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sodiumMg: number
  sugarG?: number
  fiberG?: number
  saturatedFatG?: number
}

type FoodItem = {
  id: string
  name: string
  nameEn?: string
  category: string
  aliases?: string[]
  pieceWeightG?: number
  servingGrams?: number
  servingLabel?: string
  per100g: N
  refinedCarbLevel?: "low" | "medium" | "high"
}

function f(
  id: string,
  name: string,
  category: string,
  pieceWeightG: number,
  servingLabel: string,
  per100g: N,
  aliases?: string[],
  refinedCarbLevel?: "low" | "medium" | "high",
  nameEn?: string
): FoodItem {
  return {
    id,
    name,
    nameEn,
    category,
    pieceWeightG,
    servingGrams: pieceWeightG,
    servingLabel,
    per100g,
    aliases,
    refinedCarbLevel,
  }
}

/** 검색·유사 매칭용 기본 음식 (복합 음식명의 뿌리) */
export const FOOD_SEARCH_BASE_ITEMS: FoodItem[] = [
  f(
    "baeksuk",
    "백숙",
    "식사",
    400,
    "1그릇",
    { calories: 45, carbsG: 1, proteinG: 6, fatG: 1.5, sodiumMg: 280 },
    ["능이백숙", "닭백숙", "한방백숙", "누룽지백숙", "오리백숙"],
    "low",
    "baeksuk"
  ),
  f(
    "chicken-baeksuk",
    "닭백숙",
    "식사",
    450,
    "1그릇",
    { calories: 48, carbsG: 1.2, proteinG: 6.5, fatG: 1.8, sodiumMg: 300 },
    ["능이백숙", "한방백숙", "닭백숙"],
    "low",
    "chicken baeksuk"
  ),
  f(
    "herbal-baeksuk",
    "한방백숙",
    "식사",
    450,
    "1그릇",
    { calories: 50, carbsG: 2, proteinG: 6, fatG: 2, sodiumMg: 320 },
    ["능이백숙", "닭백숙", "한방백숙"],
    "low",
    "herbal baeksuk"
  ),
  f(
    "rice-fried",
    "볶음밥",
    "곡물",
    350,
    "1그릇",
    { calories: 160, carbsG: 23, proteinG: 5, fatG: 5, sodiumMg: 400 },
    ["김치볶음밥", "새우볶음밥", "야채볶음밥", "계란볶음밥"],
    "high",
    "fried rice"
  ),
  f(
    "shrimp-fried-rice",
    "새우볶음밥",
    "곡물",
    350,
    "1그릇",
    { calories: 155, carbsG: 22, proteinG: 6, fatG: 5, sodiumMg: 420 },
    ["새우볶음밥", "볶음밥"],
    "high",
    "shrimp fried rice"
  ),
  f(
    "beef-seaweed-soup",
    "소고기미역국",
    "반찬",
    300,
    "1그릇",
    { calories: 38, carbsG: 3, proteinG: 3.5, fatG: 1.6, sodiumMg: 720 },
    ["소고기미역국", "미역국", "미역 국"],
    "low",
    "beef seaweed soup"
  ),
  f(
    "tuna-kimchi-jjigae",
    "참치김치찌개",
    "반찬",
    300,
    "1그릇",
    { calories: 58, carbsG: 5, proteinG: 5, fatG: 2.5, sodiumMg: 880 },
    ["참치김치찌개", "김치찌개", "김치 찌개"],
    "low",
    "tuna kimchi stew"
  ),
  f(
    "pork-kimchi-jjigae",
    "돼지고기김치찌개",
    "반찬",
    300,
    "1그릇",
    { calories: 62, carbsG: 5, proteinG: 5.5, fatG: 3, sodiumMg: 900 },
    ["돼지고기김치찌개", "김치찌개", "김치 찌개"],
    "low",
    "pork kimchi stew"
  ),
  f(
    "cheese-ramen",
    "치즈라면",
    "탄수",
    500,
    "1봉",
    { calories: 95, carbsG: 13, proteinG: 3, fatG: 4.5, sodiumMg: 550 },
    ["치즈라면", "라면"],
    "high",
    "cheese ramen"
  ),
  f(
    "gukbap",
    "국밥",
    "식사",
    500,
    "1그릇",
    { calories: 72, carbsG: 8, proteinG: 5, fatG: 2.8, sodiumMg: 460 },
    ["돼지국밥", "소고기국밥", "순대국밥", "국밥"],
    "medium",
    "gukbap"
  ),
  f(
    "ppane-pasta",
    "빠네파스타",
    "식사",
    350,
    "1그릇",
    { calories: 145, carbsG: 18, proteinG: 5, fatG: 6, sodiumMg: 450 },
    ["빠네", "ppane", "pane", "크림파스타"],
    "high",
    "ppane pasta"
  ),
  f(
    "cream-pasta",
    "크림파스타",
    "식사",
    350,
    "1그릇",
    { calories: 150, carbsG: 17, proteinG: 5, fatG: 7, sodiumMg: 480 },
    ["빠네", "cream pasta", "파스타"],
    "high",
    "cream pasta"
  ),
  f(
    "pasta-generic",
    "파스타",
    "탄수",
    200,
    "1인분",
    { calories: 131, carbsG: 25, proteinG: 5, fatG: 1.1, sodiumMg: 1 },
    ["pasta", "spaghetti", "빠네"],
    "high",
    "pasta"
  ),
  f(
    "duck-baeksuk",
    "오리백숙",
    "식사",
    450,
    "1그릇",
    { calories: 52, carbsG: 1.5, proteinG: 6.2, fatG: 2.5, sodiumMg: 310 },
    ["오리백숙", "백숙", "능이백숙"],
    "low",
    "duck baeksuk"
  ),
  f(
    "risotto",
    "리조또",
    "식사",
    300,
    "1그릇",
    { calories: 130, carbsG: 22, proteinG: 4, fatG: 3.5, sodiumMg: 380 },
    ["크림리조또", "risotto"],
    "high",
    "risotto"
  ),
  f(
    "cream-risotto",
    "크림리조또",
    "식사",
    300,
    "1그릇",
    { calories: 145, carbsG: 21, proteinG: 4.5, fatG: 5.5, sodiumMg: 420 },
    ["리조또", "크림", "cream risotto"],
    "high",
    "cream risotto"
  ),
  f(
    "chicken-breast-salad",
    "닭가슴살샐러드",
    "식사",
    300,
    "1그릇",
    { calories: 82, carbsG: 5, proteinG: 11, fatG: 2.2, sodiumMg: 130 },
    ["닭가슴살샐러드", "닭가슴살", "샐러드"],
    "low",
    "chicken breast salad"
  ),
]
