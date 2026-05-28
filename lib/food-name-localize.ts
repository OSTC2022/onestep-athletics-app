import type { FoodDatabaseItem } from "@/lib/food-database"
import { FOOD_DATABASE_ITEMS } from "@/lib/food-database-data"
import type { ExternalFoodSearchResult } from "@/lib/external-food-types"

const HANGUL_RE = /[\uAC00-\uD7A3]/
const LATIN_RE = /[a-zA-Z]/

/** 조리 상태 */
const COOKING_STATE_KO: Record<string, string> = {
  cooked: "조리",
  raw: "생",
  boiled: "삶은",
  fried: "튀김",
  baked: "구운",
  roasted: "로스팅",
  grilled: "구운",
  steamed: "찐",
  dried: "건조",
  frozen: "냉동",
  canned: "통조림",
  fresh: "신선",
  simmered: "데친",
  braised: "조림",
  smoked: "훈제",
  pickled: "절임",
}

/** 영문 음식명 → 한국어 (소문자 키) */
const FOOD_EN_KO: Record<string, string> = {
  pasta: "파스타",
  spaghetti: "스파게티",
  macaroni: "마카로니",
  lasagna: "라자냐",
  noodles: "국수",
  noodle: "국수",
  ramen: "라면",
  udon: "우동",
  soba: "메밀국수",
  rice: "쌀",
  bread: "빵",
  toast: "토스트",
  bagel: "베이글",
  croissant: "크로아상",
  muffin: "머핀",
  pancake: "팬케이크",
  waffle: "와플",
  cereal: "시리얼",
  oatmeal: "오트밀",
  oats: "귀리",
  quinoa: "퀴노아",
  barley: "보리",
  chicken: "닭고기",
  "chicken breast": "닭가슴살",
  "chicken thigh": "닭다리살",
  beef: "소고기",
  pork: "돼지고기",
  bacon: "베이컨",
  ham: "햄",
  sausage: "소시지",
  turkey: "칠면조",
  duck: "오리고기",
  egg: "계란",
  eggs: "계란",
  tofu: "두부",
  salmon: "연어",
  tuna: "참치",
  shrimp: "새우",
  crab: "게",
  fish: "생선",
  milk: "우유",
  cheese: "치즈",
  butter: "버터",
  yogurt: "요거트",
  cream: "크림",
  apple: "사과",
  banana: "바나나",
  orange: "오렌지",
  grape: "포도",
  strawberry: "딸기",
  blueberry: "블루베리",
  watermelon: "수박",
  peach: "복숭아",
  pear: "배",
  mango: "망고",
  avocado: "아보카도",
  tomato: "토마토",
  potato: "감자",
  "sweet potato": "고구마",
  carrot: "당근",
  onion: "양파",
  garlic: "마늘",
  broccoli: "브로콜리",
  spinach: "시금치",
  cabbage: "양배추",
  lettuce: "상추",
  cucumber: "오이",
  mushroom: "버섯",
  corn: "옥수수",
  bean: "콩",
  beans: "콩",
  lentil: "렌틸콩",
  chickpea: "병아리콩",
  peanut: "땅콩",
  almond: "아몬드",
  walnut: "호두",
  pizza: "피자",
  burger: "버거",
  hamburger: "햄버거",
  sandwich: "샌드위치",
  salad: "샐러드",
  soup: "수프",
  stew: "찌개",
  curry: "카레",
  sushi: "스시",
  dumpling: "만두",
  kimchi: "김치",
  honey: "꿀",
  sugar: "설탕",
  chocolate: "초콜릿",
  cookie: "쿠키",
  cake: "케이크",
  "ice cream": "아이스크림",
  coffee: "커피",
  tea: "차",
  juice: "주스",
  water: "물",
  beer: "맥주",
  wine: "와인",
  cola: "콜라",
  soda: "탄산음료",
  protein: "단백질",
  "protein powder": "단백질 파우더",
  whey: "유청",
  natto: "낫토",
  miso: "된장",
  soy: "대두",
  "soy sauce": "간장",
  oil: "기름",
  "olive oil": "올리브유",
  flour: "밀가루",
  salt: "소금",
  pepper: "후추",
  mayonnaise: "마요네즈",
  ketchup: "케첩",
  mustard: "머스타드",
  hotdog: "핫도그",
  taco: "타코",
  burrito: "부리토",
  wrap: "랩",
  steak: "스테이크",
  ribs: "갈비",
  meatball: "미트볼",
  pepperoni: "페퍼로니",
  baguette: "바게트",
  donut: "도넛",
  doughnut: "도넛",
  pie: "파이",
  tart: "타르트",
  biscuit: "비스킷",
  cracker: "크래커",
  chips: "칩",
  fries: "감자튀김",
  "french fries": "감자튀김",
  coleslaw: "코울슬로",
  hummus: "후무스",
  falafel: "팔라펠",
}

const FOOD_EN_KO_SORTED = Object.entries(FOOD_EN_KO).sort(
  (a, b) => b[0].length - a[0].length
)

function normalizeEnKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export function containsHangul(text: string): boolean {
  return HANGUL_RE.test(text)
}

export function isPrimarilyEnglishName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed || containsHangul(trimmed)) return false
  return LATIN_RE.test(trimmed)
}

function buildEnglishLookupFromDb(): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of FOOD_DATABASE_ITEMS) {
    if (item.nameEn) {
      map.set(normalizeEnKey(item.nameEn), item.name)
    }
    for (const alias of item.aliases ?? []) {
      if (isPrimarilyEnglishName(alias)) {
        map.set(normalizeEnKey(alias), item.name)
      }
    }
  }
  return map
}

const DB_EN_LOOKUP = buildEnglishLookupFromDb()

function lookupFromDictionary(key: string): string | undefined {
  const normalized = normalizeEnKey(key)
  if (FOOD_EN_KO[normalized]) return FOOD_EN_KO[normalized]
  const fromDb = DB_EN_LOOKUP.get(normalized)
  if (fromDb && containsHangul(fromDb)) return fromDb
  return undefined
}

function translateWordByWord(text: string): string {
  let result = text
  for (const [en, ko] of FOOD_EN_KO_SORTED) {
    const re = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
    result = result.replace(re, ko)
  }
  return result
}

function extractCookingState(parts: string[]): string | undefined {
  for (const part of parts) {
    const key = normalizeEnKey(part)
    for (const [en, ko] of Object.entries(COOKING_STATE_KO)) {
      if (key === en || key.includes(en)) return ko
    }
  }
  return undefined
}

/** USDA 등 영문 설명 → 한국어 음식명 */
export function localizeFoodName(
  rawName: string,
  existingNameEn?: string
): { name: string; nameEn?: string } {
  const trimmed = rawName.trim()
  if (!trimmed) return { name: trimmed, nameEn: existingNameEn }

  if (containsHangul(trimmed)) {
    return { name: trimmed, nameEn: existingNameEn }
  }

  const exact = lookupFromDictionary(trimmed)
  if (exact) {
    return { name: exact, nameEn: existingNameEn ?? trimmed }
  }

  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean)
  const mainPart = parts[0] ?? trimmed
  const mainKey = normalizeEnKey(mainPart)

  let mainKo =
    lookupFromDictionary(mainPart) ??
    lookupFromDictionary(mainKey) ??
    (translateWordByWord(mainPart).match(HANGUL_RE)
      ? translateWordByWord(mainPart)
      : undefined)

  if (!mainKo) {
    const firstWord = mainKey.split(/\s+/)[0]
    mainKo = lookupFromDictionary(firstWord)
  }

  if (!mainKo) {
    const wordTranslated = translateWordByWord(mainPart)
    if (containsHangul(wordTranslated)) {
      mainKo = wordTranslated.replace(/\s+/g, " ").trim()
    }
  }

  if (!mainKo) {
    return { name: trimmed, nameEn: existingNameEn ?? trimmed }
  }

  const stateKo = extractCookingState(parts.slice(1))
  const name = stateKo ? `${mainKo}(${stateKo})` : mainKo

  return { name, nameEn: existingNameEn ?? trimmed }
}

export function localizeFoodItem(food: FoodDatabaseItem): FoodDatabaseItem {
  if (food.isCustom) return food

  const { name, nameEn } = localizeFoodName(food.name, food.nameEn)
  if (name === food.name) return food

  const aliases = new Set(food.aliases ?? [])
  aliases.add(food.name)
  if (nameEn) aliases.add(nameEn)

  return {
    ...food,
    name,
    nameEn,
    aliases: [...aliases],
  }
}

export function localizeExternalFoodSearchResult(
  result: ExternalFoodSearchResult
): ExternalFoodSearchResult {
  const { name, nameEn } = localizeFoodName(result.name, result.nameEn)
  if (name === result.name) return result

  const aliases = new Set(result.aliases ?? [])
  aliases.add(result.name)
  if (nameEn) aliases.add(nameEn)

  return {
    ...result,
    name,
    nameEn,
    aliases: [...aliases],
  }
}

export function getFoodDisplayName(
  food: Pick<FoodDatabaseItem, "name" | "nameEn" | "isCustom">
): string {
  if (food.isCustom) return food.name
  return localizeFoodName(food.name, food.nameEn).name
}
