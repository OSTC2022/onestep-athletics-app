"use client"

import { useEffect, useState } from "react"
import { Bookmark, FolderOpen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getFoodById } from "@/lib/food-database"
import type { FoodMealSlotId } from "@/lib/meal-slot-targets"
import {
  MEAL_SLOT_LABELS,
  type SavedMealMenuItem,
  type SavedMealSlotRecord,
} from "@/lib/saved-meal-menu-store"

export function formatSavedItemsSummary(items: SavedMealMenuItem[]): string {
  if (items.length === 0) return "항목 없음"
  const names = items
    .slice(0, 2)
    .map((item) => getFoodById(item.foodId)?.name ?? item.foodId)
  return `${items.length}개 · ${names.join(", ")}${items.length > 2 ? "…" : ""}`
}

export function SaveMealMenuDialog({
  open,
  onOpenChange,
  title,
  defaultName,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  defaultName: string
  onConfirm: (name: string) => void
}) {
  const [name, setName] = useState(defaultName)

  useEffect(() => {
    if (open) setName(defaultName)
  }, [open, defaultName])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="저장 이름"
          className="h-9 text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onConfirm(name.trim() || defaultName)
              onOpenChange(false)
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onConfirm(name.trim() || defaultName)
              onOpenChange(false)
            }}
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SavedMealMenuPicker<T extends { id: string; name: string }>({
  items,
  emptyLabel,
  triggerLabel,
  getSummary,
  onLoad,
  onDelete,
}: {
  items: T[]
  emptyLabel: string
  triggerLabel: string
  getSummary: (item: T) => string
  onLoad: (item: T) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 text-[10px] border-border/60"
        >
          <FolderOpen className="h-3 w-3 mr-1" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">
            {emptyLabel}
          </p>
        ) : (
          <ul className="max-h-56 overflow-y-auto space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-1 rounded-md hover:bg-secondary/60 p-1.5"
              >
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  onClick={() => {
                    onLoad(item)
                    setOpen(false)
                  }}
                >
                  <p className="text-[11px] font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {getSummary(item)}
                  </p>
                </button>
                <button
                  type="button"
                  className="h-6 w-6 shrink-0 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  aria-label="삭제"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function MealSlotSaveLoadBar({
  slotId,
  mealLabel,
  savedSlots,
  onSave,
  onLoadSlot,
  onDeleteSlot,
  saveDisabled = false,
  className,
}: {
  slotId: FoodMealSlotId
  mealLabel: string
  savedSlots: SavedMealSlotRecord[]
  onSave: (name: string) => void
  onLoadSlot: (record: SavedMealSlotRecord) => void
  onDeleteSlot: (id: string) => void
  saveDisabled?: boolean
  className?: string
}) {
  const [saveOpen, setSaveOpen] = useState(false)
  const defaultName = `${MEAL_SLOT_LABELS[slotId]} ${new Date().toLocaleDateString("ko-KR")}`

  return (
    <div className={className ?? "flex items-center gap-1.5"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={saveDisabled}
        className="h-8 flex-1 text-[10px] border-border/60"
        onClick={() => setSaveOpen(true)}
      >
        <Bookmark className="h-3 w-3 mr-1" />
        저장
      </Button>
      <SavedMealMenuPicker
        items={savedSlots}
        emptyLabel={`저장된 ${mealLabel} 메뉴가 없어요`}
        triggerLabel="불러오기"
        getSummary={(item) => formatSavedItemsSummary(item.items)}
        onLoad={onLoadSlot}
        onDelete={onDeleteSlot}
      />
      <SaveMealMenuDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title={`${mealLabel} 메뉴 저장`}
        defaultName={defaultName}
        onConfirm={onSave}
      />
    </div>
  )
}
