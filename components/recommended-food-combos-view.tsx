"use client"

import { ChevronDown, Loader2, RefreshCw, Settings2, Target, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { formatCalories } from "@/lib/user-profile"
import { formatMacroG, formatMacroGNullable } from "@/lib/food-nutrition-utils"
import {
  NUTRITION_GOAL_OPTIONS,
  RECOMMENDATION_INTENSITY_OPTIONS,
  TRAINING_STATUS_OPTIONS,
  labelForGoal,
  labelForIntensity,
  type NutritionStrategySettings,
} from "@/lib/food-recommendation-strategy"
import type {
  DeficitChip,
  RecommendFoodCombo,
  RecommendFoodsResponse,
} from "@/lib/food-recommendation-types"
import { cn } from "@/lib/utils"

/** 추천 메뉴·조합 목록 — 휠·터치 드래그 스크롤 */
export const RECOMMENDATION_LIST_SCROLL_CLASS =
  "max-h-[min(440px,58dvh)] overflow-y-auto overscroll-y-contain touch-pan-y [scrollbar-gutter:stable]"

type StrategyChipProps<T extends string> = {
  label: string
  options: Array<{ id: T; label: string }>
  value: T
  onChange: (v: T) => void
}

function StrategyChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: StrategyChipProps<T>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
              value === opt.id
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-border/50 bg-secondary/20 text-muted-foreground hover:border-accent/30 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function DeficitBadge({ chip }: { chip: DeficitChip }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-medium tabular-nums",
        chip.severity === "warn" &&
          "border-orange-500/40 bg-orange-500/10 text-orange-300",
        chip.severity === "caution" &&
          "border-amber-500/35 bg-amber-500/10 text-amber-200",
        chip.severity === "good" &&
          "border-accent/35 bg-accent/10 text-accent",
        chip.severity === "ok" && "border-border/50 bg-secondary/30 text-muted-foreground"
      )}
    >
      {chip.label}
    </span>
  )
}

function formatMacro(value: number | null | undefined): string {
  return formatMacroGNullable(value)
}

function formatTargetRange(combo: RecommendFoodCombo): string {
  const r = combo.targetRange
  return `칼로리 ${r.calories.min}~${r.calories.max}kcal · 단백 ${r.protein.min}g+`
}

export function ComboCard({
  combo,
  onSelectItem,
  onApplyCombo,
  descriptionMode = "brief",
}: {
  combo: RecommendFoodCombo
  onSelectItem?: (
    item: RecommendFoodCombo["items"][number],
    combo: RecommendFoodCombo
  ) => void
  onApplyCombo?: (combo: RecommendFoodCombo) => void
  descriptionMode?: "brief" | "detailed"
}) {
  const detailed = descriptionMode === "detailed"

  return (
    <div className="rounded-xl border border-border/60 bg-black/20 px-3 py-3 space-y-2.5">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold leading-snug">{combo.title}</p>
          <span className="shrink-0 rounded border border-accent/25 bg-accent/8 px-1.5 py-0.5 text-[9px] text-accent">
            {combo.level}
          </span>
        </div>
        {detailed ? (
          <>
            <p className="text-[10px] text-muted-foreground">{combo.situation}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
              <span>추천 목적: {combo.recommendedPurpose}</span>
              <span>권장 끼니: {combo.recommendedSlotLabel}</span>
              <span>평가 기준: {combo.evaluationCriteria.label}</span>
              <span className="tabular-nums">{formatTargetRange(combo)}</span>
            </div>
            <p className="text-[11px] text-foreground/85 leading-relaxed mt-1">
              {combo.reason}
            </p>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {combo.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-border/50 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {combo.recommendedSlotLabel}
          </p>
        )}
      </div>

      <ul className="space-y-1 border-t border-border/40 pt-2">
        {combo.items.map((item) => (
          <li key={`${combo.id}-${item.id}`}>
            <button
              type="button"
              onClick={() => onSelectItem?.(item, combo)}
              className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/5 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[12px] font-medium truncate">{item.nameKo}</p>
                {detailed ? (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {item.amountG}g · {item.calories}kcal · P{formatMacroG(item.protein)}g · C
                    {formatMacro(item.carbs)} · F{formatMacro(item.fat)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {item.calories}kcal
                  </p>
                )}
              </div>
              {onSelectItem ? (
                <span className="text-[10px] text-accent shrink-0">선택</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-border/40 bg-secondary/10 px-2.5 py-2">
        <p className="text-[10px] text-muted-foreground mb-1">영양 합계</p>
        <p className="text-[11px] font-medium tabular-nums text-accent">
          {detailed ? (
            <>
              {formatCalories(combo.total.calories)}kcal · 단백 {formatMacroG(combo.total.protein)}g · 탄수{" "}
              {formatMacro(combo.total.carbs)} · 지방 {formatMacro(combo.total.fat)}
              {combo.total.fiber > 0 ? ` · 식이섬유 ${formatMacroG(combo.total.fiber)}g` : ""}
            </>
          ) : (
            <>{formatCalories(combo.total.calories)}kcal · 단백 {formatMacroG(combo.total.protein)}g</>
          )}
        </p>
      </div>

      {onApplyCombo ? (
        <Button
          type="button"
          size="sm"
          className="w-full h-8 text-[11px] bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => onApplyCombo(combo)}
        >
          이 식단 적용하기
        </Button>
      ) : null}
    </div>
  )
}

export type NutritionRecommendationPanelProps = {
  settings: NutritionStrategySettings
  onSettingsChange: (patch: Partial<NutritionStrategySettings>) => void
  loading: boolean
  error: string | null
  response: RecommendFoodsResponse | null
  hasRequested: boolean
  onRequest: () => void
  onRefresh: () => void
  onSelectItem?: (
    item: RecommendFoodCombo["items"][number],
    combo: RecommendFoodCombo
  ) => void
  onApplyCombo?: (combo: RecommendFoodCombo) => void
  descriptionMode?: "brief" | "detailed"
  onDescriptionModeToggle?: () => void
  className?: string
}

function DescriptionModeToggleButton({
  mode,
  onToggle,
}: {
  mode: "brief" | "detailed"
  onToggle: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 px-2.5 text-[11px] border-accent/30 text-accent hover:bg-accent/10 shrink-0"
      onClick={onToggle}
      aria-label={mode === "brief" ? "설명 상세히 보기" : "설명 간략히 보기"}
    >
      {mode === "brief" ? "설명 상세히" : "설명 간략히"}
    </Button>
  )
}

export function NutritionRecommendationPanel({
  settings,
  onSettingsChange,
  loading,
  error,
  response,
  hasRequested,
  onRequest,
  onRefresh,
  onSelectItem,
  onApplyCombo,
  descriptionMode = "brief",
  onDescriptionModeToggle,
  className,
}: NutritionRecommendationPanelProps) {
  const strategyTitle =
    response?.strategy.title ?? `${labelForGoal(settings.goal)} 모드`
  const strategyGuidance =
    response?.strategy.guidance ??
    "목표와 훈련 상태를 설정한 뒤 오늘 식단 추천을 받아보세요."
  const deficits = response?.deficits ?? []
  const strategyDescription =
    descriptionMode === "brief"
      ? response?.strategy.title ?? strategyTitle
      : response
        ? `${response.summary}\n${response.strategy.guidance}`
        : strategyGuidance

  return (
    <div className={cn("space-y-3", className)}>
      {/* 영양 전략 카드 */}
      <div className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/8 to-transparent px-3 py-3">
        <div className="flex items-start gap-2.5">
          <div className="h-9 w-9 rounded-lg border border-accent/30 bg-accent/10 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-accent/80 font-medium">
              오늘의 영양 전략
            </p>
            <p className="text-[13px] font-semibold mt-0.5">{strategyTitle}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
              {strategyDescription}
            </p>
          </div>
        </div>

        {(deficits.length > 0 || hasRequested) && (
          <div className="mt-2.5 pt-2.5 border-t border-accent/15">
            <p className="text-[10px] text-muted-foreground mb-1.5">현재 부족·주의 영양소</p>
            <div className="flex flex-wrap gap-1">
              {deficits.length > 0 ? (
                deficits.map((chip) => <DeficitBadge key={chip.label} chip={chip} />)
              ) : (
                <DeficitBadge chip={{ label: "분석 대기", severity: "ok" }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 설정 */}
      <Collapsible defaultOpen={!hasRequested}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-secondary/10 px-3 py-2.5 text-left hover:bg-secondary/20 transition-colors">
          <span className="flex items-center gap-2 text-[12px] font-medium">
            <Settings2 className="h-3.5 w-3.5 text-accent" />
            추천 설정
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3 rounded-xl border border-border/40 bg-black/15 px-3 py-3">
          <StrategyChipRow
            label="오늘의 목표"
            options={NUTRITION_GOAL_OPTIONS}
            value={settings.goal}
            onChange={(goal) => onSettingsChange({ goal })}
          />
          <StrategyChipRow
            label="오늘의 훈련 상태"
            options={TRAINING_STATUS_OPTIONS}
            value={settings.trainingStatus}
            onChange={(trainingStatus) => onSettingsChange({ trainingStatus })}
          />
          <StrategyChipRow
            label="추천 강도"
            options={RECOMMENDATION_INTENSITY_OPTIONS}
            value={settings.intensity}
            onChange={(intensity) => onSettingsChange({ intensity })}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* CTA */}
      <Button
        type="button"
        disabled={loading}
        className="w-full h-10 bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
        onClick={onRequest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Zap className="h-4 w-4 mr-2" />
        )}
        오늘 식단 추천받기
      </Button>

      {/* 결과 */}
      {loading && hasRequested && !error ? (
        <p className="text-[12px] text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          영양 전략 분석 · 검색 중…
        </p>
      ) : null}

      {error && !response?.recommendations.length ? (
        <div className="text-center space-y-2 py-3 rounded-xl border border-border/40 bg-secondary/10 px-3">
          <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-line">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            다시 추천받기
          </Button>
        </div>
      ) : null}

      {response?.recommendations.length ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {response.mode} · {response.trainingStatus} · {response.mealTiming}
                {response.relaxed ? " · 조건 완화" : ""}
                {response.pipeline ? (
                  <>
                    {" · "}분석 {response.pipeline.afterScoringCount.toLocaleString("ko-KR")}개
                    {" · "}표시 {response.recommendations.length}개 조합
                  </>
                ) : (
                  <>{" · "}후보 {response.candidateCount}개</>
                )}
              </p>
              {response.pipeline ? (
                <p className="text-[9px] text-muted-foreground/80 tabular-nums leading-relaxed">
                  DB {response.pipeline.totalFoodItems.toLocaleString("ko-KR")}개
                  {" → "}1차 {response.pipeline.baseCandidateCount.toLocaleString("ko-KR")}개
                  {" → "}필터 후 {response.pipeline.afterHardFilterCount.toLocaleString("ko-KR")}개
                  {response.pipeline.afterQualityFilterCount != null ? (
                    <>
                      {" → "}품질검증 {response.pipeline.afterQualityFilterCount.toLocaleString("ko-KR")}개
                    </>
                  ) : null}
                  {" → "}점수 통과 {response.pipeline.afterScoringCount.toLocaleString("ko-KR")}개
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onDescriptionModeToggle ? (
                <DescriptionModeToggleButton
                  mode={descriptionMode}
                  onToggle={onDescriptionModeToggle}
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px] border-accent/30 text-accent hover:bg-accent/10"
                onClick={onRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                다른 조합
              </Button>
            </div>
          </div>
          {response.pipelineMessages?.length ? (
            <div className="rounded-lg border border-border/40 bg-secondary/10 px-2.5 py-2 space-y-1">
              {response.pipelineMessages.map((msg) => (
                <p key={msg} className="text-[10px] text-muted-foreground leading-relaxed">
                  {msg}
                </p>
              ))}
            </div>
          ) : null}
          <div
            className={cn(
              RECOMMENDATION_LIST_SCROLL_CLASS,
              "rounded-xl border border-border/40 bg-black/10 px-1 py-1"
            )}
            aria-label="추천 식단 목록"
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              {response.recommendations.map((combo) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  onSelectItem={onSelectItem}
                  onApplyCombo={onApplyCombo}
                  descriptionMode={descriptionMode}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated NutritionRecommendationPanel 사용 */
export const RecommendedFoodCombosView = NutritionRecommendationPanel
export const RecommendedFoodCombosIntro = NutritionRecommendationPanel
