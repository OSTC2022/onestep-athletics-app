"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  FORM_INPUT_CLASS,
  FORM_SELECT_CLASS,
  FORM_TEXTAREA_CLASS,
} from "@/lib/form-styles"
import {
  TRAINING_INTENSITY_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  saveTrainingSession,
  type TrainingSession,
} from "@/lib/training-session"
import { LocationFavoritesField } from "@/components/location-favorites-field"
import { TrainingTemplatesField } from "@/components/training-templates-field"
import { AddressSearchButton } from "@/components/address-search-dialog"
import { cn } from "@/lib/utils"

function FormSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-[#111811] p-4 space-y-3",
        className
      )}
    >
      <h2 className="text-[13px] font-semibold text-accent">{title}</h2>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function TrainingSessionEditForm({
  session,
}: {
  session: TrainingSession
}) {
  const router = useRouter()
  const [form, setForm] = useState(session)
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof TrainingSession>(
    key: K,
    value: TrainingSession[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateLocation = (patch: {
    name?: string
    address?: string
    mapQuery?: string
    lat?: number
    lng?: number
  }) => {
    setForm((prev) => ({
      ...prev,
      location: {
        name: patch.name ?? prev.location?.name ?? "",
        address: patch.address ?? prev.location?.address,
        mapQuery: patch.mapQuery ?? prev.location?.mapQuery,
        lat: patch.lat ?? prev.location?.lat,
        lng: patch.lng ?? prev.location?.lng,
      },
    }))
  }

  const isValid = useMemo(
    () => form.title.trim().length > 0 && form.date.length > 0,
    [form.title, form.date]
  )

  const handleSave = () => {
    if (!isValid) return
    setSaving(true)
    const location =
      form.location?.name?.trim()
        ? {
            name: form.location.name.trim(),
            address: form.location.address?.trim() || undefined,
            mapQuery: form.location.mapQuery?.trim() || undefined,
            lat:
              typeof form.location.lat === "number" &&
              Number.isFinite(form.location.lat)
                ? form.location.lat
                : undefined,
            lng:
              typeof form.location.lng === "number" &&
              Number.isFinite(form.location.lng)
                ? form.location.lng
                : undefined,
          }
        : null

    saveTrainingSession({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      totalDistance: form.totalDistance.trim(),
      location,
    })
    toast.success("훈련을 저장했습니다")
    setSaving(false)
    router.push(`/training/${form.id}`)
  }

  return (
    <div className="pb-28">
      <div className="px-4 py-5 space-y-4">
        <TrainingTemplatesField form={form} onApply={setForm} />

        <FormSection title="기본 정보">
          <Field label="훈련명">
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className={FORM_INPUT_CLASS}
              placeholder="예: 인터벌 훈련"
            />
          </Field>
          <Field label="훈련 유형">
            <select
              value={form.type}
              onChange={(e) =>
                update("type", e.target.value as TrainingSession["type"])
              }
              className={FORM_SELECT_CLASS}
            >
              {TRAINING_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="날짜">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className={FORM_INPUT_CLASS}
              />
            </Field>
            <Field label="총 거리">
              <Input
                value={form.totalDistance}
                onChange={(e) => update("totalDistance", e.target.value)}
                className={FORM_INPUT_CLASS}
                placeholder="5.2km"
              />
            </Field>
          </div>
          <div className="rounded-xl border border-border/40 bg-black/30 px-3 py-2.5 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              검색 시 장소명·주소가 함께 채워집니다. 다르면 각각 수정하세요.
            </p>
            <Field label="장소명">
              <Input
                value={form.location?.name ?? ""}
                onChange={(e) => updateLocation({ name: e.target.value })}
                className={FORM_INPUT_CLASS}
                placeholder="잠실 보조경기장 트랙"
              />
            </Field>
            <Field label="주소">
              <div className="flex gap-2">
                <Input
                  value={form.location?.address ?? ""}
                  onChange={(e) => updateLocation({ address: e.target.value })}
                  className={cn(FORM_INPUT_CLASS, "flex-1 min-w-0")}
                  placeholder="서울특별시 ..."
                />
                <AddressSearchButton
                  className="shrink-0 h-10 border-accent/40 text-accent hover:bg-accent/10 px-3"
                  initialPreview={{
                    name: form.location?.name ?? "",
                    address: form.location?.address ?? "",
                    lat: form.location?.lat,
                    lng: form.location?.lng,
                  }}
                  onSelect={(result) => {
                    setForm((prev) => ({
                      ...prev,
                      location: {
                        name: result.name.trim(),
                        address: result.address.trim(),
                        lat: result.lat,
                        lng: result.lng,
                      },
                    }))
                    toast.success("장소명·주소·좌표를 적용했습니다")
                  }}
                />
              </div>
            </Field>
          </div>
          <LocationFavoritesField
            name={form.location?.name ?? ""}
            address={form.location?.address ?? ""}
            onSelect={(location) =>
              setForm((prev) => ({
                ...prev,
                location: {
                  name: location.name,
                  address: location.address ?? "",
                },
              }))
            }
          />
          <Field label="설명 (선택)">
            <Input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={FORM_INPUT_CLASS}
              placeholder="400m x 8 (rest 90초)"
            />
          </Field>
        </FormSection>

        <FormSection title="훈련 구성">
          <Field label="워밍업">
            <Textarea
              value={form.warmup}
              onChange={(e) => update("warmup", e.target.value)}
              rows={2}
              className={FORM_TEXTAREA_CLASS}
              placeholder="조깅 2km + 동적 스트레칭"
            />
          </Field>
          <Field label="메인">
            <Textarea
              value={form.mainSet}
              onChange={(e) => update("mainSet", e.target.value)}
              rows={3}
              className={FORM_TEXTAREA_CLASS}
              placeholder="400m 인터벌 8회"
            />
          </Field>
          <Field label="쿨다운">
            <Textarea
              value={form.cooldown}
              onChange={(e) => update("cooldown", e.target.value)}
              rows={2}
              className={FORM_TEXTAREA_CLASS}
              placeholder="조깅 1km + 정적 스트레칭"
            />
          </Field>
        </FormSection>

        <FormSection title="목표 정보">
          <div className="grid grid-cols-2 gap-3">
            <Field label="목표 페이스">
              <Input
                value={form.targetPace}
                onChange={(e) => update("targetPace", e.target.value)}
                className={FORM_INPUT_CLASS}
                placeholder="75초/400m"
              />
            </Field>
            <Field label="휴식 시간">
              <Input
                value={form.restTime}
                onChange={(e) => update("restTime", e.target.value)}
                className={FORM_INPUT_CLASS}
                placeholder="90초"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="훈련 강도">
              <select
                value={form.intensity}
                onChange={(e) =>
                  update("intensity", e.target.value as TrainingSession["intensity"])
                }
                className={FORM_SELECT_CLASS}
              >
                {TRAINING_INTENSITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="예상 소요 시간">
              <Input
                value={form.estimatedDuration}
                onChange={(e) => update("estimatedDuration", e.target.value)}
                className={FORM_INPUT_CLASS}
                placeholder="50분"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="메모">
          <Field label="코치 메모">
            <Textarea
              value={form.coachMemo}
              onChange={(e) => update("coachMemo", e.target.value)}
              rows={4}
              className={FORM_TEXTAREA_CLASS}
              placeholder="코치 안내 사항"
            />
          </Field>
          <Field label="선수 유의사항">
            <Textarea
              value={form.athleteNotes}
              onChange={(e) => update("athleteNotes", e.target.value)}
              rows={3}
              className={FORM_TEXTAREA_CLASS}
              placeholder="개인별 유의사항"
            />
          </Field>
        </FormSection>
      </div>

      <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-4 pb-2">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-black/95 backdrop-blur-md p-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-xl bg-[#1a1a1a] text-foreground hover:bg-[#252525]"
            onClick={() => router.back()}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSave}
            disabled={!isValid || saving}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </div>
  )
}
