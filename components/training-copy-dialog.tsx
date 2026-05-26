"use client"

import { useState } from "react"
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
import { copyTrainingSession, getTodayDateKey } from "@/lib/training-session"

export function TrainingCopyDialog({
  open,
  onOpenChange,
  sessionId,
  onCopied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  onCopied?: (newId: string) => void
}) {
  const tomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  const [targetDate, setTargetDate] = useState(tomorrow)

  const handleCopy = () => {
    const copied = copyTrainingSession(sessionId, targetDate)
    if (!copied) return
    onOpenChange(false)
    onCopied?.(copied.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">훈련 복사</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="copy-date" className="text-sm text-muted-foreground">
            복사할 날짜
          </Label>
          <Input
            id="copy-date"
            type="date"
            value={targetDate}
            min={getTodayDateKey()}
            onChange={(e) => setTargetDate(e.target.value)}
            className={FORM_INPUT_CLASS}
          />
          <p className="text-[11px] text-muted-foreground">
            같은 날짜에 훈련이 있으면 덮어씁니다.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="button"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleCopy}
          >
            복사
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
