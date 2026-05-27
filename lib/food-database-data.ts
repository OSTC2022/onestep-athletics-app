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
  refinedCarbLevel?: "low" | "medium" | "high"
): FoodItem {
  return {
    id,
    name,
    category,
    pieceWeightG,
    servingGrams: pieceWeightG,
    servingLabel,
    per100g,
    aliases,
    refinedCarbLevel,
  }
}

/** 검색 가능한 음식 DB — 100g 기준 영양성분 (대략값) */
export const FOOD_DATABASE_ITEMS: FoodItem[] = [
  // ── 곡물 · 밥 ──
  f("rice-white", "백미밥", "곡물", 210, "1공기", { calories: 130, carbsG: 28, proteinG: 2.5, fatG: 0.3, sodiumMg: 1 }, ["흰밥", "쌀밥"], "high"),
  f("rice-brown", "현미밥", "곡물", 210, "1공기", { calories: 111, carbsG: 23, proteinG: 2.5, fatG: 0.8, sodiumMg: 5, fiberG: 1.8 }, ["현미"], "medium"),
  f("rice-mixed", "잡곡밥", "곡물", 210, "1공기", { calories: 118, carbsG: 24, proteinG: 3.2, fatG: 1.2, sodiumMg: 3 }, ["혼합잡곡"]),
  f("rice-barley", "보리밥", "곡물", 210, "1공기", { calories: 123, carbsG: 26, proteinG: 2.8, fatG: 0.5, sodiumMg: 2 }),
  f("rice-black", "흑미밥", "곡물", 210, "1공기", { calories: 115, carbsG: 24, proteinG: 3, fatG: 1, sodiumMg: 2 }),
  f("rice-red", "적미밥", "곡물", 210, "1공기", { calories: 112, carbsG: 23, proteinG: 2.8, fatG: 0.9, sodiumMg: 2 }),
  f("congee", "죽", "곡물", 300, "1그릇", { calories: 50, carbsG: 10, proteinG: 1.2, fatG: 0.3, sodiumMg: 150 }),
  f("quinoa-cooked", "퀴노아(삶은)", "곡물", 150, "1공기", { calories: 120, carbsG: 21, proteinG: 4.4, fatG: 1.9, sodiumMg: 7 }, ["퀴노아"]),
  f("barley-cooked", "보리(삶은)", "곡물", 150, "1공기", { calories: 123, carbsG: 28, proteinG: 2.3, fatG: 0.4, sodiumMg: 3 }),
  f("millet-cooked", "기장(삶은)", "곡물", 150, "1공기", { calories: 119, carbsG: 23, proteinG: 3.5, fatG: 1, sodiumMg: 2 }, ["기장"]),
  f("sorghum-cooked", "수수(삶은)", "곡물", 150, "1공기", { calories: 126, carbsG: 26, proteinG: 3.3, fatG: 1.2, sodiumMg: 2 }),
  f("buckwheat-cooked", "메밀(삶은)", "곡물", 150, "1공기", { calories: 92, carbsG: 20, proteinG: 3.4, fatG: 0.6, sodiumMg: 1 }, ["메밀밥"]),
  f("oatmeal-cooked", "오트밀(조리)", "곡물", 200, "1그릇", { calories: 71, carbsG: 12, proteinG: 2.5, fatG: 1.5, sodiumMg: 4 }, ["귀리죽"], "medium"),
  f("oatmeal-dry", "귀리(건조)", "곡물", 40, "1/2컵", { calories: 389, carbsG: 66, proteinG: 13, fatG: 7, sodiumMg: 2, fiberG: 10.6 }, ["오트밀", "귀리"], "medium"),
  f("cereal", "시리얼", "곡물", 40, "1컵", { calories: 380, carbsG: 84, proteinG: 7, fatG: 2, sodiumMg: 400 }, undefined, "high"),
  f("corn-flakes", "콘플레이크", "곡물", 35, "1컵", { calories: 357, carbsG: 84, proteinG: 7, fatG: 0.4, sodiumMg: 270 }, undefined, "high"),

  // ── 탄수 · 빵 · 면 · 전분 ──
  f("sweet-potato", "고구마", "탄수", 150, "1개", { calories: 86, carbsG: 20, proteinG: 1.5, fatG: 0.1, sodiumMg: 55, fiberG: 3.0 }, undefined, "medium"),
  f("potato", "감자", "탄수", 150, "1개", { calories: 77, carbsG: 17, proteinG: 1.8, fatG: 0.1, sodiumMg: 5 }, ["포테이토"]),
  f("potato-boiled", "감자(삶은)", "탄수", 150, "1개", { calories: 86, carbsG: 20, proteinG: 1.9, fatG: 0.1, sodiumMg: 4 }),
  f("corn", "옥수수", "탄수", 150, "1개", { calories: 96, carbsG: 19, proteinG: 3.3, fatG: 1.2, sodiumMg: 1, sugarG: 4.5 }, ["콘"]),
  f("bread-white", "식빵", "탄수", 30, "1장", { calories: 265, carbsG: 49, proteinG: 9, fatG: 3.2, sodiumMg: 430 }, undefined, "high"),
  f("bread-whole", "통밀빵", "탄수", 30, "1장", { calories: 247, carbsG: 45, proteinG: 9, fatG: 3, sodiumMg: 400 }, undefined, "medium"),
  f("baguette", "바게트", "탄수", 50, "1조각", { calories: 274, carbsG: 56, proteinG: 9, fatG: 1.5, sodiumMg: 540 }),
  f("croissant", "크로아상", "탄수", 60, "1개", { calories: 406, carbsG: 45, proteinG: 8, fatG: 21, sodiumMg: 380 }),
  f("rice-cake", "떡", "탄수", 80, "1조각", { calories: 235, carbsG: 52, proteinG: 3, fatG: 0.5, sodiumMg: 5 }, undefined, "high"),
  f("pasta", "스파게티(삶은)", "탄수", 200, "1인분", { calories: 131, carbsG: 25, proteinG: 5, fatG: 1.1, sodiumMg: 1 }, undefined, "high"),
  f("udon", "우동(삶은)", "탄수", 250, "1인분", { calories: 105, carbsG: 22, proteinG: 3, fatG: 0.5, sodiumMg: 10 }, undefined, "high"),
  f("soba", "메밀국수(삶은)", "탄수", 200, "1인분", { calories: 99, carbsG: 21, proteinG: 4, fatG: 0.2, sodiumMg: 5 }),
  f("ramen", "라면(조리)", "탄수", 500, "1봉", { calories: 88, carbsG: 12, proteinG: 2, fatG: 3.5, sodiumMg: 400 }),
  f("instant-noodle", "컵라면", "탄수", 120, "1개", { calories: 450, carbsG: 60, proteinG: 8, fatG: 18, sodiumMg: 1600 }),
  f("rice-noodle", "쌀국수(삶은)", "탄수", 200, "1인분", { calories: 109, carbsG: 25, proteinG: 1.8, fatG: 0.2, sodiumMg: 5 }),
  f("glass-noodle", "당면(삶은)", "탄수", 100, "1인분", { calories: 351, carbsG: 86, proteinG: 0.1, fatG: 0.1, sodiumMg: 10 }, ["당면"]),
  f("shirataki", "곤약밥", "탄수", 150, "1공기", { calories: 10, carbsG: 2, proteinG: 0, fatG: 0, sodiumMg: 5 }),
  f("pizza", "피자", "탄수", 150, "2조각", { calories: 266, carbsG: 33, proteinG: 11, fatG: 10, sodiumMg: 550 }),
  f("burger", "햄버거", "탄수", 200, "1개", { calories: 250, carbsG: 28, proteinG: 13, fatG: 10, sodiumMg: 480 }),

  // ── 과일 ──
  f("apple", "사과", "과일", 200, "1개", { calories: 52, carbsG: 14, proteinG: 0.3, fatG: 0.2, sodiumMg: 1, sugarG: 10, fiberG: 2.4 }),
  f("pear", "배", "과일", 250, "1개", { calories: 57, carbsG: 15, proteinG: 0.4, fatG: 0.1, sodiumMg: 1, sugarG: 10, fiberG: 3.1 }),
  f("banana", "바나나", "과일", 120, "1개", { calories: 89, carbsG: 23, proteinG: 1.1, fatG: 0.3, sodiumMg: 1, sugarG: 12, fiberG: 2.6 }),
  f("orange", "오렌지", "과일", 180, "1개", { calories: 47, carbsG: 12, proteinG: 0.9, fatG: 0.1, sodiumMg: 0, sugarG: 9 }),
  f("mandarin", "귤", "과일", 100, "1개", { calories: 53, carbsG: 13, proteinG: 0.8, fatG: 0.3, sodiumMg: 2, sugarG: 11 }, ["천혜향", "한라봉"]),
  f("hallabong", "한라봉", "과일", 200, "1개", { calories: 47, carbsG: 12, proteinG: 0.8, fatG: 0.2, sodiumMg: 2, sugarG: 9 }),
  f("grapefruit", "자몽", "과일", 200, "1/2개", { calories: 42, carbsG: 11, proteinG: 0.8, fatG: 0.1, sodiumMg: 0, sugarG: 7 }),
  f("lemon", "레몬", "과일", 60, "1개", { calories: 29, carbsG: 9, proteinG: 1.1, fatG: 0.3, sodiumMg: 2, sugarG: 2.5 }),
  f("strawberry", "딸기", "과일", 15, "1개", { calories: 32, carbsG: 7.7, proteinG: 0.7, fatG: 0.3, sodiumMg: 1, sugarG: 4.9 }),
  f("blueberry", "블루베리", "과일", 100, "1컵", { calories: 57, carbsG: 14, proteinG: 0.7, fatG: 0.3, sodiumMg: 1, sugarG: 10 }),
  f("grape", "포도", "과일", 150, "1송이", { calories: 69, carbsG: 18, proteinG: 0.7, fatG: 0.2, sodiumMg: 2, sugarG: 16 }),
  f("peach", "복숭아", "과일", 150, "1개", { calories: 39, carbsG: 10, proteinG: 0.9, fatG: 0.3, sodiumMg: 0, sugarG: 8.4 }),
  f("plum", "자두", "과일", 70, "1개", { calories: 46, carbsG: 11, proteinG: 0.7, fatG: 0.3, sodiumMg: 0, sugarG: 10 }),
  f("apricot", "살구", "과일", 35, "1개", { calories: 48, carbsG: 11, proteinG: 1.4, fatG: 0.4, sodiumMg: 1, sugarG: 9 }),
  f("cherry", "체리", "과일", 100, "1컵", { calories: 63, carbsG: 16, proteinG: 1.1, fatG: 0.2, sodiumMg: 0, sugarG: 13 }),
  f("kiwi", "키위", "과일", 100, "1개", { calories: 61, carbsG: 15, proteinG: 1.1, fatG: 0.5, sodiumMg: 3, sugarG: 9, fiberG: 3.0 }),
  f("mango", "망고", "과일", 200, "1개", { calories: 60, carbsG: 15, proteinG: 0.8, fatG: 0.4, sodiumMg: 1, sugarG: 14 }),
  f("pineapple", "파인애플", "과일", 150, "1조각", { calories: 50, carbsG: 13, proteinG: 0.5, fatG: 0.1, sodiumMg: 1, sugarG: 10 }),
  f("watermelon", "수박", "과일", 200, "1조각", { calories: 30, carbsG: 7.6, proteinG: 0.6, fatG: 0.2, sodiumMg: 1, sugarG: 6.2 }),
  f("chamoe", "참외", "과일", 300, "1개", { calories: 34, carbsG: 8.5, proteinG: 0.8, fatG: 0.2, sodiumMg: 15, sugarG: 7.5 }, ["오이멜론"]),
  f("melon", "멜론", "과일", 150, "1/4개", { calories: 34, carbsG: 8.2, proteinG: 0.8, fatG: 0.2, sodiumMg: 16, sugarG: 7.9 }, ["캔틸루프", "허니듀"]),
  f("persimmon", "감", "과일", 170, "1개", { calories: 70, carbsG: 19, proteinG: 0.6, fatG: 0.2, sodiumMg: 1, sugarG: 13 }, ["단감"]),
  f("dried-persimmon", "곶감", "과일", 30, "1개", { calories: 274, carbsG: 73, proteinG: 1.4, fatG: 0.4, sodiumMg: 2, sugarG: 59 }),
  f("pomegranate", "석류", "과일", 150, "1/2개", { calories: 83, carbsG: 19, proteinG: 1.7, fatG: 1.2, sodiumMg: 3, sugarG: 14 }),
  f("dragon-fruit", "용과", "과일", 200, "1/2개", { calories: 60, carbsG: 13, proteinG: 1.2, fatG: 0.4, sodiumMg: 0, sugarG: 8 }),
  f("lychee", "리치", "과일", 100, "10알", { calories: 66, carbsG: 17, proteinG: 0.8, fatG: 0.4, sodiumMg: 1, sugarG: 15 }),
  f("fig", "무화과", "과일", 50, "1개", { calories: 74, carbsG: 19, proteinG: 0.8, fatG: 0.3, sodiumMg: 1, sugarG: 16 }),
  f("shine-muscat", "샤인머스캣", "과일", 150, "1송이", { calories: 69, carbsG: 18, proteinG: 0.7, fatG: 0.2, sodiumMg: 2, sugarG: 16 }),
  f("tomato", "토마토", "과일", 150, "1개", { calories: 18, carbsG: 3.9, proteinG: 0.9, fatG: 0.2, sodiumMg: 5, sugarG: 2.6 }),
  f("cherry-tomato", "방울토마토", "과일", 100, "1컵", { calories: 18, carbsG: 3.9, proteinG: 0.9, fatG: 0.2, sodiumMg: 5, sugarG: 2.6 }),
  f("avocado", "아보카도", "과일", 100, "1/2개", { calories: 160, carbsG: 8.5, proteinG: 2, fatG: 15, sodiumMg: 7, fiberG: 6.7 }),
  f("coconut", "코코넛", "과일", 50, "1조각", { calories: 354, carbsG: 15, proteinG: 3.3, fatG: 33, sodiumMg: 20, sugarG: 6 }),
  f("papaya", "파파야", "과일", 200, "1/2개", { calories: 43, carbsG: 11, proteinG: 0.5, fatG: 0.3, sodiumMg: 8, sugarG: 8 }),
  f("guava", "구아바", "과일", 100, "1개", { calories: 68, carbsG: 14, proteinG: 2.6, fatG: 1, sodiumMg: 2, sugarG: 9 }),
  f("raspberry", "라즈베리", "과일", 100, "1컵", { calories: 52, carbsG: 12, proteinG: 1.2, fatG: 0.7, sodiumMg: 1, sugarG: 4.4 }),
  f("blackberry", "블랙베리", "과일", 100, "1컵", { calories: 43, carbsG: 10, proteinG: 1.4, fatG: 0.5, sodiumMg: 1, sugarG: 4.9 }),
  f("cranberry", "크랜베리", "과일", 100, "1컵", { calories: 46, carbsG: 12, proteinG: 0.4, fatG: 0.1, sodiumMg: 2, sugarG: 4 }),
  f("yuzu", "유자", "과일", 100, "1개", { calories: 53, carbsG: 13, proteinG: 0.8, fatG: 0.3, sodiumMg: 2, sugarG: 2 }),

  // ── 채소 ──
  f("cucumber", "오이", "채소", 100, "1개", { calories: 15, carbsG: 3.6, proteinG: 0.7, fatG: 0.1, sodiumMg: 2 }),
  f("lettuce", "상추", "채소", 50, "1포기", { calories: 15, carbsG: 2.9, proteinG: 1.4, fatG: 0.2, sodiumMg: 28 }),
  f("spinach", "시금치", "채소", 100, "1컵", { calories: 23, carbsG: 3.6, proteinG: 2.9, fatG: 0.4, sodiumMg: 79, fiberG: 2.2 }),
  f("broccoli", "브로콜리", "채소", 100, "1컵", { calories: 34, carbsG: 7, proteinG: 2.8, fatG: 0.4, sodiumMg: 33, fiberG: 2.6 }),
  f("cabbage", "양배추", "채소", 100, "1컵", { calories: 25, carbsG: 6, proteinG: 1.3, fatG: 0.1, sodiumMg: 18, fiberG: 2.5 }),
  f("carrot", "당근", "채소", 80, "1개", { calories: 41, carbsG: 10, proteinG: 0.9, fatG: 0.2, sodiumMg: 69, fiberG: 2.8 }),
  f("onion", "양파", "채소", 110, "1개", { calories: 40, carbsG: 9, proteinG: 1.1, fatG: 0.1, sodiumMg: 4 }),
  f("bell-pepper", "피망", "채소", 120, "1개", { calories: 31, carbsG: 6, proteinG: 1, fatG: 0.3, sodiumMg: 4 }),
  f("mushroom", "버섯", "채소", 100, "1컵", { calories: 22, carbsG: 3.3, proteinG: 3.1, fatG: 0.3, sodiumMg: 5 }),
  f("king-oyster-mushroom", "목이버섯", "채소", 120, "1개", { calories: 35, carbsG: 6.5, proteinG: 2.4, fatG: 0.4, sodiumMg: 5, fiberG: 3.2 }, ["새송이버섯", "새송이", "king oyster"]),
  f("eggplant", "가지", "채소", 200, "1개", { calories: 25, carbsG: 6, proteinG: 1, fatG: 0.2, sodiumMg: 2 }),
  f("zucchini", "주키니", "채소", 200, "1개", { calories: 17, carbsG: 3.1, proteinG: 1.2, fatG: 0.3, sodiumMg: 8 }),
  f("bean-sprout", "콩나물", "채소", 100, "1봉", { calories: 31, carbsG: 6, proteinG: 3, fatG: 0.2, sodiumMg: 6, fiberG: 1.8 }),
  f("napa-cabbage", "배추", "채소", 200, "1/4포기", { calories: 16, carbsG: 3.2, proteinG: 1.2, fatG: 0.2, sodiumMg: 9 }),
  f("radish", "무", "채소", 300, "1/2개", { calories: 18, carbsG: 4, proteinG: 0.6, fatG: 0.1, sodiumMg: 21 }),
  f("green-onion", "대파", "채소", 15, "1대", { calories: 32, carbsG: 7, proteinG: 1.8, fatG: 0.2, sodiumMg: 16 }),
  f("garlic", "마늘", "채소", 5, "1쪽", { calories: 149, carbsG: 33, proteinG: 6.4, fatG: 0.5, sodiumMg: 17 }),
  f("sweet-pumpkin", "단호박", "채소", 200, "1/4개", { calories: 45, carbsG: 12, proteinG: 1, fatG: 0.1, sodiumMg: 5, sugarG: 2.5, fiberG: 2.0 }, ["호박"]),
  f("seaweed", "김", "채소", 5, "1장", { calories: 290, carbsG: 52, proteinG: 34, fatG: 2, sodiumMg: 780, fiberG: 35 }),
  f("wakame", "미역", "채소", 10, "1줌", { calories: 45, carbsG: 9, proteinG: 3, fatG: 0.6, sodiumMg: 872, fiberG: 3.0 }),

  // ── 단백질 ──
  f("chicken-breast", "닭가슴살(삶은)", "단백", 120, "1토막", { calories: 165, carbsG: 0, proteinG: 31, fatG: 3.6, sodiumMg: 74 }, ["닭가슴"]),
  f("chicken-thigh", "닭다리(구이)", "단백", 100, "1토막", { calories: 209, carbsG: 0, proteinG: 26, fatG: 11, sodiumMg: 84 }),
  f("chicken-wing", "닭날개(구이)", "단백", 80, "2개", { calories: 290, carbsG: 0, proteinG: 27, fatG: 19, sodiumMg: 120 }),
  f("fried-chicken", "치킨", "단백", 150, "3조각", { calories: 246, carbsG: 10, proteinG: 19, fatG: 15, sodiumMg: 450 }),
  f("egg", "계란(삶은)", "단백", 50, "1개", { calories: 155, carbsG: 1.1, proteinG: 12.6, fatG: 10.6, sodiumMg: 140 }, ["달걀", "계란", "삶은계란"]),
  f("egg-white", "계란 흰자", "단백", 35, "1개", { calories: 52, carbsG: 0.7, proteinG: 11, fatG: 0.2, sodiumMg: 166 }, ["흰자", "계란흰자", "달걀흰자"]),
  f("egg-yolk", "계란 노른자", "단백", 17, "1개", { calories: 322, carbsG: 3.6, proteinG: 16, fatG: 27, sodiumMg: 48 }, ["노른자", "계란노른자", "달걀노른자"]),
  f("tuna-can", "참치캔(물)", "단백", 80, "1/2캔", { calories: 116, carbsG: 0, proteinG: 26, fatG: 1, sodiumMg: 320 }),
  f("tuna-can-oil", "참치캔(기름)", "단백", 80, "1/2캔", { calories: 198, carbsG: 0, proteinG: 29, fatG: 8, sodiumMg: 320 }),
  f("salmon", "연어(구이)", "단백", 120, "1토막", { calories: 208, carbsG: 0, proteinG: 20, fatG: 13, sodiumMg: 59 }),
  f("mackerel", "고등어(구이)", "단백", 120, "1토막", { calories: 262, carbsG: 0, proteinG: 24, fatG: 18, sodiumMg: 90 }),
  f("saury", "꽁치(구이)", "단백", 100, "1마리", { calories: 205, carbsG: 0, proteinG: 19, fatG: 14, sodiumMg: 70 }),
  f("shrimp", "새우(삶은)", "단백", 100, "1컵", { calories: 99, carbsG: 0.2, proteinG: 24, fatG: 0.3, sodiumMg: 111 }),
  f("squid", "오징어(구이)", "단백", 100, "1마리", { calories: 175, carbsG: 7.5, proteinG: 18, fatG: 7.5, sodiumMg: 44 }),
  f("tofu", "두부", "단백", 150, "1/2모", { calories: 76, carbsG: 2, proteinG: 8, fatG: 4.8, sodiumMg: 7 }),
  f("firm-tofu", "단단한두부", "단백", 150, "1/2모", { calories: 80, carbsG: 2, proteinG: 9, fatG: 5, sodiumMg: 7 }, ["찌개두부"]),
  f("silken-tofu", "순두부", "단백", 300, "1팩", { calories: 55, carbsG: 2, proteinG: 5, fatG: 3, sodiumMg: 5 }),
  f("tempeh", "템페", "단백", 100, "1컵", { calories: 192, carbsG: 9, proteinG: 20, fatG: 11, sodiumMg: 9 }),
  f("greek-yogurt", "그릭요거트", "단백", 150, "1컵", { calories: 59, carbsG: 4, proteinG: 10, fatG: 0.4, sodiumMg: 36 }),
  f("yogurt", "요거트", "단백", 150, "1컵", { calories: 61, carbsG: 7, proteinG: 3.5, fatG: 3.3, sodiumMg: 46 }),
  f("cottage-cheese", "코티지치즈", "단백", 100, "1/2컵", { calories: 98, carbsG: 3.4, proteinG: 11, fatG: 4.3, sodiumMg: 364 }),
  f("cheese", "치즈", "단백", 30, "1장", { calories: 402, carbsG: 1.3, proteinG: 25, fatG: 33, sodiumMg: 621 }),
  f("protein-powder", "웨이프로틴", "단백", 30, "1스coop", { calories: 400, carbsG: 8, proteinG: 80, fatG: 5, sodiumMg: 200 }),
  f("beef-sirloin", "소고기(등심)", "단백", 100, "1인분", { calories: 250, carbsG: 0, proteinG: 26, fatG: 15, sodiumMg: 60 }),
  f("beef-ground", "소고기(다짐)", "단백", 100, "1인분", { calories: 250, carbsG: 0, proteinG: 26, fatG: 15, sodiumMg: 72 }),
  f("pork-loin", "돼지고기(안심)", "단백", 100, "1인분", { calories: 143, carbsG: 0, proteinG: 21, fatG: 6, sodiumMg: 62 }),
  f("pork-belly", "삼겹살(생)", "단백", 100, "1인분", { calories: 518, carbsG: 0, proteinG: 9, fatG: 53, sodiumMg: 55 }),
  f("ham", "햄", "단백", 50, "2장", { calories: 145, carbsG: 1.5, proteinG: 21, fatG: 6, sodiumMg: 1200 }),
  f("sausage", "소시지", "단백", 80, "1개", { calories: 301, carbsG: 2, proteinG: 12, fatG: 27, sodiumMg: 800 }),
  f("bacon", "베이컨", "단백", 30, "3장", { calories: 541, carbsG: 1.4, proteinG: 37, fatG: 42, sodiumMg: 1717 }),

  // ── 견과 · 지방 ──
  f("almond", "아몬드", "지방", 30, "1줌", { calories: 579, carbsG: 22, proteinG: 21, fatG: 50, sodiumMg: 1, fiberG: 12.5 }),
  f("walnut", "호두", "지방", 30, "1줌", { calories: 654, carbsG: 14, proteinG: 15, fatG: 65, sodiumMg: 2, fiberG: 6.7 }),
  f("peanut", "땅콩", "지방", 30, "1줌", { calories: 567, carbsG: 16, proteinG: 26, fatG: 49, sodiumMg: 18, fiberG: 8.4 }),
  f("cashew", "캐슈넛", "지방", 30, "1줌", { calories: 553, carbsG: 30, proteinG: 18, fatG: 44, sodiumMg: 12 }),
  f("pistachio", "피스타치오", "지방", 30, "1줌", { calories: 560, carbsG: 28, proteinG: 20, fatG: 45, sodiumMg: 1 }),
  f("sunflower-seed", "해바라기씨", "지방", 30, "1줌", { calories: 584, carbsG: 20, proteinG: 21, fatG: 51, sodiumMg: 9 }),
  f("chia-seed", "치아씨드", "지방", 15, "1큰술", { calories: 486, carbsG: 42, proteinG: 17, fatG: 31, sodiumMg: 16, fiberG: 34 }),
  f("olive-oil", "올리브오일", "지방", 14, "1큰술", { calories: 884, carbsG: 0, proteinG: 0, fatG: 100, sodiumMg: 2 }),
  f("peanut-butter", "땅콩버터", "지방", 15, "1큰술", { calories: 588, carbsG: 22, proteinG: 22, fatG: 50, sodiumMg: 190 }),
  f("butter", "버터", "지방", 14, "1큰술", { calories: 717, carbsG: 0.1, proteinG: 0.9, fatG: 81, sodiumMg: 11 }),
  f("mayonnaise", "마요네즈", "지방", 15, "1큰술", { calories: 680, carbsG: 0.6, proteinG: 1, fatG: 75, sodiumMg: 635 }),

  // ── 반찬 · 국 ──
  f("kimchi", "배추김치", "반찬", 50, "1접시", { calories: 15, carbsG: 2.4, proteinG: 1.1, fatG: 0.5, sodiumMg: 600, fiberG: 1.8 }),
  f("radish-kimchi", "깍두기", "반찬", 50, "1접시", { calories: 18, carbsG: 3.5, proteinG: 0.8, fatG: 0.2, sodiumMg: 550 }),
  f("doenjang-soup", "된장찌개", "반찬", 250, "1그릇", { calories: 45, carbsG: 4, proteinG: 3, fatG: 2, sodiumMg: 800 }),
  f("kimchi-jjigae", "김치찌개", "반찬", 300, "1그릇", { calories: 55, carbsG: 5, proteinG: 4, fatG: 2.5, sodiumMg: 900 }),
  f("miyeok-guk", "미역국", "반찬", 300, "1그릇", { calories: 35, carbsG: 3, proteinG: 3, fatG: 1.5, sodiumMg: 700 }),
  f("seaweed-soup", "시래기국", "반찬", 300, "1그릇", { calories: 30, carbsG: 4, proteinG: 2, fatG: 1, sodiumMg: 650 }),
  f("steamed-egg", "계란찜", "반찬", 150, "1인분", { calories: 120, carbsG: 2, proteinG: 10, fatG: 8, sodiumMg: 200 }),
  f("spinach-side", "시금치나물", "반찬", 80, "1접시", { calories: 35, carbsG: 4, proteinG: 2.5, fatG: 1.5, sodiumMg: 300 }),
  f("bean-sprout-side", "콩나물무침", "반찬", 80, "1접시", { calories: 40, carbsG: 5, proteinG: 3, fatG: 1.5, sodiumMg: 280 }),
  f("pickled-radish", "단무지", "반찬", 30, "1접시", { calories: 30, carbsG: 7, proteinG: 0.3, fatG: 0, sodiumMg: 400 }),
  f("fish-cake", "어묵", "반찬", 80, "1꼬치", { calories: 95, carbsG: 10, proteinG: 6, fatG: 3, sodiumMg: 650 }),

  // ── 식사 · 한식 · 외식 ──
  f("bibimbap", "비빔밥", "식사", 400, "1그릇", { calories: 130, carbsG: 18, proteinG: 5, fatG: 4, sodiumMg: 350 }),
  f("gimbap", "김밥", "식사", 250, "1줄", { calories: 140, carbsG: 22, proteinG: 4, fatG: 4, sodiumMg: 280 }, undefined, "high"),
  f("triangle-kimbap", "삼각김밥", "식사", 110, "1개", { calories: 165, carbsG: 30, proteinG: 4, fatG: 3, sodiumMg: 350 }, undefined, "high"),
  f("dosirak", "도시락(일반)", "식사", 450, "1개", { calories: 150, carbsG: 20, proteinG: 6, fatG: 5, sodiumMg: 400 }),
  f("salad-chicken", "닭가슴살 샐러드", "식사", 300, "1그릇", { calories: 85, carbsG: 5, proteinG: 12, fatG: 2, sodiumMg: 120 }),
  f("sandwich", "샌드위치", "식사", 180, "1개", { calories: 250, carbsG: 30, proteinG: 10, fatG: 10, sodiumMg: 450 }),
  f("bulgogi", "불고기", "식사", 150, "1인분", { calories: 220, carbsG: 8, proteinG: 18, fatG: 13, sodiumMg: 450 }),
  f("samgyeopsal", "삼겹살(구이)", "식사", 150, "1인분", { calories: 330, carbsG: 0, proteinG: 16, fatG: 29, sodiumMg: 55 }),
  f("tuna-rice", "참치마요덮밥", "식사", 400, "1그릇", { calories: 175, carbsG: 22, proteinG: 8, fatG: 6, sodiumMg: 320 }),
  f("chicken-rice", "치킨마요덮밥", "식사", 400, "1그릇", { calories: 190, carbsG: 20, proteinG: 10, fatG: 8, sodiumMg: 350 }),
  f("curry-rice", "카레라이스", "식사", 400, "1그릇", { calories: 150, carbsG: 22, proteinG: 4, fatG: 5, sodiumMg: 500 }),
  f("donkatsu", "돈까스", "식사", 200, "1인분", { calories: 260, carbsG: 20, proteinG: 15, fatG: 14, sodiumMg: 450 }),
  f("tteokbokki", "떡볶이", "식사", 300, "1인분", { calories: 145, carbsG: 30, proteinG: 3, fatG: 2, sodiumMg: 600 }),
  f("ramyeon-street", "국물떡볶이", "식사", 350, "1인분", { calories: 130, carbsG: 25, proteinG: 3, fatG: 2.5, sodiumMg: 700 }),
  f("kimbap-tuna", "참치김밥", "식사", 250, "1줄", { calories: 155, carbsG: 22, proteinG: 6, fatG: 5, sodiumMg: 320 }, undefined, "high"),
  f("bossam", "보쌈", "식사", 150, "1인분", { calories: 250, carbsG: 0, proteinG: 18, fatG: 19, sodiumMg: 60 }),
  f("galbi", "갈비(구이)", "식사", 150, "1인분", { calories: 280, carbsG: 5, proteinG: 20, fatG: 20, sodiumMg: 400 }),
  f("jjajangmyeon", "짜장면", "식사", 400, "1그릇", { calories: 130, carbsG: 20, proteinG: 4, fatG: 4, sodiumMg: 550 }),
  f("jjamppong", "짬뽕", "식사", 450, "1그릇", { calories: 95, carbsG: 12, proteinG: 5, fatG: 3, sodiumMg: 900 }),
  f("naengmyeon", "냉면", "식사", 400, "1그릇", { calories: 110, carbsG: 22, proteinG: 4, fatG: 1, sodiumMg: 600 }),
  f("sushi-roll", "김밥초밥", "식사", 150, "8피스", { calories: 150, carbsG: 28, proteinG: 5, fatG: 2, sodiumMg: 400 }, ["초밥"]),
  f("sashimi", "회", "식사", 150, "1인분", { calories: 120, carbsG: 0, proteinG: 24, fatG: 3, sodiumMg: 50 }),
  f("poke-bowl", "포케", "식사", 350, "1그릇", { calories: 120, carbsG: 15, proteinG: 10, fatG: 4, sodiumMg: 350 }),
  f("caesar-salad", "시저샐러드", "식사", 250, "1그릇", { calories: 90, carbsG: 6, proteinG: 6, fatG: 6, sodiumMg: 280 }),
  f("steak", "스테이크", "식사", 200, "1인분", { calories: 271, carbsG: 0, proteinG: 26, fatG: 18, sodiumMg: 55 }),

  // ── 간식 · 디저트 ──
  f("protein-bar", "프로틴바", "간식", 60, "1개", { calories: 400, carbsG: 35, proteinG: 30, fatG: 12, sodiumMg: 180 }),
  f("chocolate", "초콜릿", "간식", 40, "1판", { calories: 546, carbsG: 61, proteinG: 5, fatG: 31, sodiumMg: 24 }),
  f("cookie", "쿠키", "간식", 30, "1개", { calories: 488, carbsG: 64, proteinG: 6, fatG: 23, sodiumMg: 350 }, undefined, "high"),
  f("ice-cream", "아이스크림", "간식", 100, "1스coop", { calories: 207, carbsG: 24, proteinG: 3.5, fatG: 11, sodiumMg: 80 }),
  f("bungeoppang", "붕어빵", "간식", 80, "2마리", { calories: 220, carbsG: 35, proteinG: 5, fatG: 6, sodiumMg: 120 }),
  f("hotteok", "호떡", "간식", 80, "1개", { calories: 230, carbsG: 40, proteinG: 4, fatG: 6, sodiumMg: 150 }),
  f("yakgwa", "약과", "간식", 30, "1개", { calories: 380, carbsG: 55, proteinG: 4, fatG: 15, sodiumMg: 50 }),
  f("dried-fruit", "건과일믹스", "간식", 40, "1줌", { calories: 320, carbsG: 75, proteinG: 2, fatG: 1, sodiumMg: 10, sugarG: 60 }),
  f("granola-bar", "그래놀라바", "간식", 40, "1개", { calories: 420, carbsG: 65, proteinG: 8, fatG: 14, sodiumMg: 180 }),
  f("popcorn", "팝콘", "간식", 30, "1컵", { calories: 387, carbsG: 78, proteinG: 13, fatG: 5, sodiumMg: 600 }),

  // ── 음료 ──
  f("milk", "우유", "음료", 200, "1컵", { calories: 42, carbsG: 5, proteinG: 3.4, fatG: 1, sodiumMg: 44 }),
  f("lowfat-milk", "저지방우유", "음료", 200, "1컵", { calories: 34, carbsG: 5, proteinG: 3.4, fatG: 0.2, sodiumMg: 44 }),
  f("soy-milk", "두유", "음료", 200, "1팩", { calories: 54, carbsG: 6, proteinG: 3.5, fatG: 2, sodiumMg: 30 }),
  f("protein-shake", "단백질 쉐이크", "음료", 300, "1잔", { calories: 80, carbsG: 8, proteinG: 12, fatG: 1, sodiumMg: 100 }),
  f("sports-drink", "스포츠음료", "음료", 500, "1병", { calories: 28, carbsG: 6.5, proteinG: 0, fatG: 0, sodiumMg: 45 }),
  f("coffee-latte", "카페라떼", "음료", 350, "1잔", { calories: 43, carbsG: 4, proteinG: 2.5, fatG: 2, sodiumMg: 40 }),
  f("americano", "아메리카노", "음료", 350, "1잔", { calories: 2, carbsG: 0, proteinG: 0.3, fatG: 0, sodiumMg: 5 }),
  f("green-tea", "녹차", "음료", 250, "1잔", { calories: 1, carbsG: 0, proteinG: 0, fatG: 0, sodiumMg: 2 }),
  f("orange-juice", "오렌지주스", "음료", 250, "1잔", { calories: 45, carbsG: 10, proteinG: 0.7, fatG: 0.2, sodiumMg: 1, sugarG: 9 }),
  f("apple-juice", "사과주스", "음료", 250, "1잔", { calories: 46, carbsG: 11, proteinG: 0.1, fatG: 0.1, sodiumMg: 4, sugarG: 10 }),
  f("smoothie", "스무디", "음료", 350, "1잔", { calories: 65, carbsG: 14, proteinG: 2, fatG: 0.5, sodiumMg: 20, sugarG: 12 }),
  f("cola", "콜라", "음료", 355, "1캔", { calories: 42, carbsG: 11, proteinG: 0, fatG: 0, sodiumMg: 4, sugarG: 11 }),
  f("zero-cola", "제로콜라", "음료", 355, "1캔", { calories: 0, carbsG: 0, proteinG: 0, fatG: 0, sodiumMg: 4 }),
  f("energy-drink", "에너지음료", "음료", 250, "1캔", { calories: 45, carbsG: 11, proteinG: 0, fatG: 0, sodiumMg: 80, sugarG: 11 }),
  f("beer", "맥주", "음료", 500, "1잔", { calories: 43, carbsG: 3.6, proteinG: 0.5, fatG: 0, sodiumMg: 4 }),
  f("soju", "소주", "음료", 50, "1잔", { calories: 130, carbsG: 0, proteinG: 0, fatG: 0, sodiumMg: 1 }),
]
