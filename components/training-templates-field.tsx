"use client"

import { useState } from "react"
import { Bookmark, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FORM_INPUT_CLASS } from "@/lib/form-styles"
import {
  applyTemplateToSession,
  deleteTrainingTemplate,
  getTemplateSummary,
  saveTrainingTemplate,
  type TrainingTemplate,
} from "@/lib/training-templates"
import {
  getTrainingTypeMeta,
  type TrainingSession,
} from "@/lib/training-session"
import { useTrainingTemplates } from "@/hooks/use-training-templates"
import { cn } from "@/lib/utils"

export function TrainingTemplatesField({
  form,
  onApply,
}: {
  form: TrainingSession
  onApply: (next: TrainingSession) => void
}) {
  const templates = useTrainingTemplates()
  const [saveOpen, setSaveOpen] = useState(false)
  const [label, setLabel] = useState("")

  const openSaveDialog = () => {
    setLabel(form.title.trim() || "내 훈련 템플릿")
    setSaveOpen(true)
  }

  const handleSave = () => {
    try {
      saveTrainingTemplate(label, form)
      toast.success("훈련 템플릿을 즐겨찾기에 저장했습니다")
      setSaveOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다")
    }
  }

  const handleApply = (template: TrainingTemplate) => {
    onApply(applyTemplateToSession(form, template))
    toast.success(`「${template.label}」 템플릿을 불러왔습니다`)
  }

  return (
    <>
      <section className="rounded-2xl border border-accent/25 bg-accent/5 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-accent flex items-center gap-1.5">
              <Bookmark className="h-4 w-4" />
              훈련 템플릿 즐겨찾기
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              기본 정보, 훈련 구성, 목표, 메모를 저장해 두었다가 언제든 다시
              불러올 수 있습니다. 날짜는 유지됩니다.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openSaveDialog}
            className="shrink-0 h-8 px-2.5 text-[11px] gap-1 text-accent hover:bg-accent/10"
          >
            <Star className="h-3.5 w-3.5" />
            저장
          </Button>
        </div>

        {templates.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/90 rounded-lg border border-dashed border-border/50 px-3 py-2.5">
            자주 쓰는 훈련 내용을 저장해 두면 새 훈련 작성이 빨라집니다.
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {templates.map((template) => {
              const typeMeta = getTrainingTypeMeta(template.content.type)
              const summary = getTemplateSummary(template)

              return (
                <li key={template.id} className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => handleApply(template)}
                    className="flex-1 min-w-0 flex items-start gap-2 rounded-xl border border-border/50 bg-black/40 px-3 py-2.5 text-left active:bg-accent/10 transition-colors"
                  >
                    <Star className="h-4 w-4 text-accent shrink-0 mt-0.5 fill-accent/30" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {template.label}
                        </p>
                        <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                          {typeMeta.badge}
                        </span>
                      </div>
                      {summary ? (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {summary}
                        </p>
                      ) : null}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteTrainingTemplate(template.id)
                      toast.success("템플릿을 삭제했습니다")
                    }}
                    className="shrink-0 w-10 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={`${template.label} 템플릿 삭제`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">템플릿 저장</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="template-label" className="text-sm text-muted-foreground">
              템플릿 이름
            </Label>
            <Input
              id="template-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={FORM_INPUT_CLASS}
              placeholder="예: 인터벌 기본 세트"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              현재 입력된 기본 정보, 훈련 구성, 목표 정보, 메모가 저장됩니다.
              같은 이름이 있으면 덮어씁니다.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              className={cn("bg-accent text-accent-foreground hover:bg-accent/90")}
              onClick={handleSave}
              disabled={!label.trim()}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
