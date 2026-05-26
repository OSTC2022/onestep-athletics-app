"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/lib/app-settings"
import {
  DEFAULT_USER_PROFILE,
  DIET_MODE_OPTIONS,
  GOAL_OPTIONS,
  INTENSITY_OPTIONS,
  MAIN_EVENT_OPTIONS,
  SNACK_FREQUENCY_OPTIONS,
  calculateDailyMacroTargets,
  getExpectedWeightChangeLabel,
  NUTRITION_BASIS_LABEL,
  loadUserProfile,
  saveUserProfile,
  type DietMode,
  type Gender,
  type GoalType,
  type MainEvent,
  type SnackFrequency,
  type TrainingIntensity,
  type UserProfile,
} from "@/lib/user-profile"
import { recordWeightFromProfile } from "@/lib/weight-tracker"
import { cn } from "@/lib/utils"

const C = {
  lime: "#64b869",
  bg: "#000000",
  card: "#0a0a0a",
  cardInner: "#111811",
  border: "#1c2a1c",
  textSub: "#888888",
} as const

export type SettingsSection =
  | "profile"
  | "goals"
  | "nutrition"
  | "app"
  | "all"
  | "detail"

const SECTION_META: Record<
  SettingsSection,
  { title: string; subtitle: string }
> = {
  profile: {
    title: "내 정보",
    subtitle: "이름과 기본 신체 정보를 입력하세요",
  },
  goals: {
    title: "목표 설정",
    subtitle: "체중·운동 목표와 훈련 정보를 설정하세요",
  },
  detail: {
    title: "상세 설정",
    subtitle: "키·나이·운동량 등 영양 목표 계산에 사용됩니다",
  },
  nutrition: {
    title: "영양 설정",
    subtitle: "식습관과 코치 메모를 관리하세요",
  },
  app: {
    title: "앱 설정",
    subtitle: "알림과 앱 환경을 설정하세요",
  },
  all: {
    title: "내 정보 & 목표 설정",
    subtitle: "입력한 정보로 영양 목표가 계산됩니다",
  },
}

function parseSection(value: string | null): SettingsSection {
  if (
    value === "profile" ||
    value === "goals" ||
    value === "nutrition" ||
    value === "app" ||
    value === "detail"
  ) {
    return value
  }
  return "all"
}

function SettingsCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl p-[18px] space-y-4"
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
      }}
    >
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  )
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

const inputClass =
  "h-11 rounded-xl bg-black/40 border-border/60 text-white placeholder:text-muted-foreground"

function OptionButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 px-3 rounded-xl text-[13px] font-medium border transition-colors",
            value === option.value
              ? "bg-accent/15 border-accent/50 text-accent"
              : "bg-black/30 border-border/50 text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ProfileSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const section = parseSection(searchParams.get("section"))
  const meta = SECTION_META[section]

  const [form, setForm] = useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(loadUserProfile())
    setAppSettings(loadAppSettings())
  }, [])

  const previewTargets = useMemo(
    () => calculateDailyMacroTargets(form),
    [form]
  )

  const update = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K]
  ) => {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateApp = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSaved(false)
    setAppSettings((prev) => ({ ...prev, [key]: value }))
  }

  const showProfile = section === "profile" || section === "all"
  const showDetail = section === "detail"
  const showGoals = section === "goals" || section === "all"
  const showExercise =
    section === "goals" || section === "all" || section === "detail"
  const showNutrition = section === "nutrition" || section === "all"
  const showApp = section === "app"
  const showPreview =
    section === "nutrition" ||
    section === "goals" ||
    section === "all" ||
    section === "detail"

  const handleSave = () => {
    if (section === "app") {
      saveAppSettings(appSettings)
    } else {
      saveUserProfile(form)
      recordWeightFromProfile(form.currentWeightKg)
      if (section === "all") saveAppSettings(appSettings)
    }
    setSaved(true)
    setTimeout(() => {
      if (section === "detail") router.back()
      else router.push("/")
    }, 400)
  }

  return (
    <div
      className="min-h-full px-4 pt-[22px] pb-8"
      style={{ backgroundColor: C.bg, color: "#fff" }}
    >
      <header className="flex items-center gap-3 mb-5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] leading-tight">
            {meta.title}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: C.textSub }}>
            {meta.subtitle}
          </p>
        </div>
      </header>

      <div className="space-y-3 mb-4">
        {(showProfile || showDetail) && (
          <SettingsCard title={showDetail ? "신체 정보" : "기본 정보"}>
            {showProfile && (
              <FieldRow label="이름">
                <Input
                  className={inputClass}
                  placeholder="이름을 입력하세요"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </FieldRow>
            )}
            <FieldRow label="성별">
              <OptionButtons<Gender>
                value={form.gender}
                options={[
                  { value: "male", label: "남성" },
                  { value: "female", label: "여성" },
                ]}
                onChange={(v) => update("gender", v)}
              />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="나이">
                <Input
                  type="number"
                  className={inputClass}
                  value={form.age}
                  onChange={(e) => update("age", Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="키 (cm)">
                <Input
                  type="number"
                  className={inputClass}
                  value={form.heightCm}
                  onChange={(e) => update("heightCm", Number(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="현재 체중 (kg)">
                <Input
                  type="number"
                  className={inputClass}
                  value={form.currentWeightKg}
                  onChange={(e) =>
                    update("currentWeightKg", Number(e.target.value))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  저장 시 칼로리·탄단지·나트륨이 이 체중 기준으로 자동 계산됩니다
                </p>
              </FieldRow>
            </div>
          </SettingsCard>
        )}

        {showGoals && (
          <SettingsCard title="체중·목표">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="목표 체중 (kg)">
                <Input
                  type="number"
                  className={inputClass}
                  value={form.targetWeightKg}
                  onChange={(e) =>
                    update("targetWeightKg", Number(e.target.value))
                  }
                />
              </FieldRow>
              <FieldRow label="목표 기간 (주)">
                <Input
                  type="number"
                  className={inputClass}
                  value={form.targetWeeks}
                  onChange={(e) =>
                    update("targetWeeks", Number(e.target.value))
                  }
                />
              </FieldRow>
            </div>
            <FieldRow label="목표 유형">
              <OptionButtons<GoalType>
                value={form.goalType}
                options={GOAL_OPTIONS}
                onChange={(v) => update("goalType", v)}
              />
            </FieldRow>
            <FieldRow label="감량 강도">
              <OptionButtons<DietMode>
                value={form.dietMode}
                options={DIET_MODE_OPTIONS}
                onChange={(v) => update("dietMode", v)}
              />
            </FieldRow>
          </SettingsCard>
        )}

        {showExercise && (
          <SettingsCard title={showDetail ? "운동량" : "운동 정보"}>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="주간 운동 횟수">
                  <Input
                    type="number"
                    className={inputClass}
                    value={form.weeklyExerciseDays}
                    onChange={(e) =>
                      update("weeklyExerciseDays", Number(e.target.value))
                    }
                  />
                </FieldRow>
                <FieldRow label="하루 평균 운동 (분)">
                  <Input
                    type="number"
                    className={inputClass}
                    value={form.dailyExerciseMinutes}
                    onChange={(e) =>
                      update("dailyExerciseMinutes", Number(e.target.value))
                    }
                  />
                </FieldRow>
                <FieldRow label="주간 러닝 (km)">
                  <Input
                    type="number"
                    className={inputClass}
                    value={form.weeklyRunningKm}
                    onChange={(e) =>
                      update("weeklyRunningKm", Number(e.target.value))
                    }
                  />
                </FieldRow>
              </div>
              <FieldRow label="주 종목">
                <OptionButtons<MainEvent>
                  value={form.mainEvent}
                  options={MAIN_EVENT_OPTIONS}
                  onChange={(v) => update("mainEvent", v)}
                />
              </FieldRow>
              <FieldRow label="현재 훈련 강도">
                <OptionButtons<TrainingIntensity>
                  value={form.trainingIntensity}
                  options={INTENSITY_OPTIONS}
                  onChange={(v) => update("trainingIntensity", v)}
                />
              </FieldRow>
            </SettingsCard>
        )}

        {showNutrition && (
          <>
            <SettingsCard title="식습관 정보">
              <FieldRow label="하루 식사 횟수">
                <Input
                  type="number"
                  className={inputClass}
                  value={form.mealsPerDay}
                  onChange={(e) =>
                    update("mealsPerDay", Number(e.target.value))
                  }
                />
              </FieldRow>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.hasBreakfast}
                    onCheckedChange={(v) => update("hasBreakfast", v === true)}
                  />
                  아침 식사 함
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.hasLateNightSnack}
                    onCheckedChange={(v) =>
                      update("hasLateNightSnack", v === true)
                    }
                  />
                  야식 있음
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.lactoseIntolerant}
                    onCheckedChange={(v) =>
                      update("lactoseIntolerant", v === true)
                    }
                  />
                  유당불내증
                </label>
              </div>
              <FieldRow label="간식 빈도">
                <OptionButtons<SnackFrequency>
                  value={form.snackFrequency}
                  options={SNACK_FREQUENCY_OPTIONS}
                  onChange={(v) => update("snackFrequency", v)}
                />
              </FieldRow>
              <FieldRow label="못 먹는 음식">
                <Input
                  className={inputClass}
                  placeholder="예: 새우, 땅콩"
                  value={form.avoidedFoods}
                  onChange={(e) => update("avoidedFoods", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="선호 음식">
                <Input
                  className={inputClass}
                  placeholder="예: 닭가슴살, 바나나"
                  value={form.preferredFoods}
                  onChange={(e) => update("preferredFoods", e.target.value)}
                />
              </FieldRow>
            </SettingsCard>

            <SettingsCard title="코치 메모">
              <Textarea
                className="min-h-[100px] rounded-xl bg-black/40 border-border/60 text-white placeholder:text-muted-foreground resize-none"
                placeholder="코치가 선수에게 전달할 영양·체중 관련 메모를 입력하세요."
                value={form.coachMemo}
                onChange={(e) => update("coachMemo", e.target.value)}
              />
            </SettingsCard>
          </>
        )}

        {showApp && (
          <SettingsCard title="알림 및 환경">
            <div className="space-y-4">
              {(
                [
                  {
                    key: "pushNotifications" as const,
                    label: "푸시 알림",
                    desc: "훈련·출석 관련 알림",
                  },
                  {
                    key: "trainingReminder" as const,
                    label: "훈련 리마인더",
                    desc: "훈련 당일 아침 알림",
                  },
                  {
                    key: "weeklyReportReminder" as const,
                    label: "주간 리포트",
                    desc: "매주 일요일 리포트 알림",
                  },
                  {
                    key: "useMetricUnits" as const,
                    label: "미터법 단위",
                    desc: "km, kg 단위 사용",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                  <Switch
                    checked={appSettings[item.key]}
                    onCheckedChange={(v) => updateApp(item.key, v)}
                  />
                </div>
              ))}
            </div>
          </SettingsCard>
        )}

        {section === "all" && (
          <SettingsCard title="앱 설정">
            <div className="space-y-4">
              {(
                [
                  {
                    key: "pushNotifications" as const,
                    label: "푸시 알림",
                  },
                  {
                    key: "trainingReminder" as const,
                    label: "훈련 리마인더",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3"
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <Switch
                    checked={appSettings[item.key]}
                    onCheckedChange={(v) => updateApp(item.key, v)}
                  />
                </div>
              ))}
              <Link
                href="/settings?section=app"
                className="text-[13px] text-accent underline-offset-2 hover:underline inline-block"
              >
                앱 설정 더보기
              </Link>
            </div>
          </SettingsCard>
        )}

        {showPreview && (
          <section
            className="rounded-2xl p-[18px]"
            style={{
              backgroundColor: C.cardInner,
              border: `1px solid ${C.border}`,
            }}
          >
            <p className="text-[13px] mb-2" style={{ color: C.textSub }}>
              {previewTargets.breakdown.goalModeLabel} · {NUTRITION_BASIS_LABEL}
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ color: C.lime }}
            >
              {previewTargets.calories.toLocaleString("ko-KR")}
              <span className="text-sm font-normal ml-1">kcal</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (1끼 {previewTargets.perMeal.calories.toLocaleString("ko-KR")}kcal ·{" "}
                {previewTargets.mealsPerDay}식)
              </span>
            </p>
            <p className="text-[13px] mt-2" style={{ color: C.textSub }}>
              총 탄수화물 {previewTargets.carbsG}g · 단백질{" "}
              {previewTargets.proteinG}g · 지방 {previewTargets.fatG}g · 나트륨{" "}
              {previewTargets.sodiumMg.toLocaleString("ko-KR")}mg
            </p>
            <p className="text-[12px] mt-1" style={{ color: C.textSub }}>
              {getExpectedWeightChangeLabel(form.dietMode)}{" "}
              {previewTargets.breakdown.expectedWeightChangeRange}
            </p>
          </section>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSave}
        className="w-full h-12 rounded-2xl text-[15px] font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
      >
        <Save className="h-4 w-4 mr-2" />
        {saved ? "저장됨" : "저장하기"}
      </Button>

      <p className="text-center text-[12px] mt-3" style={{ color: C.textSub }}>
        <Link href="/" className="underline-offset-2 hover:underline">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  )
}

export function ProfileSettingsPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-full px-4 pt-[22px] pb-8"
          style={{ backgroundColor: C.bg, color: "#fff" }}
        >
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </div>
      }
    >
      <ProfileSettingsContent />
    </Suspense>
  )
}
