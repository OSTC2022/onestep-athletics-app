/** @deprecated lib/korean-food-query-map + lib/korean-food-fallback 사용 */
export {
  getKoreanFoodQueryMapEntry as getFoodSearchFallbackConfig,
  getExternalSearchQueries as getFallbackExternalQueries,
  KOREAN_FOOD_QUERY_MAP as FOOD_SEARCH_FALLBACK_DICTIONARY,
  type KoreanFoodQueryMapEntry as FoodSearchFallbackConfig,
} from "@/lib/korean-food-query-map"

export {
  rankQueryMapFallbackMatches as rankFallbackDictionaryMatches,
} from "@/lib/korean-food-fallback"
