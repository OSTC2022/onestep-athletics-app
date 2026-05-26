"use client"

import type { ReactNode } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, EyeOff, GripVertical } from "lucide-react"
import {
  HomeWidgetContentWrap,
  HomeWidgetGrid,
} from "@/components/home-widget-grid"
import {
  COL_SPAN_CLASS,
  HOME_WIDGET_META,
  colsLabel,
  type HomeWidgetCols,
  type HomeWidgetId,
  type HomeWidgetItem,
} from "@/lib/home-layout"
import { cn } from "@/lib/utils"

function nextWidth(cols: HomeWidgetCols): HomeWidgetCols {
  if (cols <= 1) return 2
  if (cols === 2) return 4
  return 2
}

function SortableWidgetItem({
  item,
  onUpdate,
  children,
}: {
  item: HomeWidgetItem
  onUpdate: (patch: Partial<Omit<HomeWidgetItem, "id">>) => void
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const meta = HOME_WIDGET_META[item.id]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        COL_SPAN_CLASS[item.cols],
        "min-w-0 relative",
        isDragging && "z-50"
      )}
    >
      <div
        className={cn(
          "relative h-full rounded-2xl ring-1 ring-accent/30 overflow-hidden",
          isDragging && "opacity-90 shadow-lg ring-2 ring-accent/50",
          !item.visible && "opacity-40"
        )}
      >
        <div className="flex items-center gap-1 border-b border-accent/20 bg-black/90 px-1.5 py-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="flex flex-1 min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-muted-foreground touch-none cursor-grab active:cursor-grabbing"
            aria-label={`${meta.label} 드래그하여 이동`}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="truncate">{meta.label}</span>
          </button>
          {item.visible && (
            <button
              type="button"
              onClick={() => onUpdate({ cols: nextWidth(item.cols) })}
              className="shrink-0 rounded-md border border-accent/30 px-1.5 py-0.5 text-[10px] font-medium text-accent"
              aria-label="너비 변경"
            >
              {colsLabel(item.cols)}
            </button>
          )}
          <button
            type="button"
            onClick={() => onUpdate({ visible: !item.visible })}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-accent"
            aria-label={item.visible ? "숨기기" : "표시"}
          >
            {item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>

        {item.visible ? (
          <HomeWidgetContentWrap>{children}</HomeWidgetContentWrap>
        ) : (
          <div className="px-3 py-5 text-center text-[11px] text-muted-foreground">
            숨김
          </div>
        )}
      </div>
    </div>
  )
}

export function HomeSortableWidgetsEditor({
  sorted,
  onReorder,
  onUpdateWidget,
  renderWidget,
}: {
  sorted: HomeWidgetItem[]
  onReorder: (orderedIds: HomeWidgetId[]) => void
  onUpdateWidget: (id: HomeWidgetId, patch: Partial<Omit<HomeWidgetItem, "id">>) => void
  renderWidget: (item: HomeWidgetItem) => ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const ids = sorted.map((w) => w.id)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as HomeWidgetId)
    const newIndex = ids.indexOf(over.id as HomeWidgetId)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <HomeWidgetGrid>
          {sorted.map((item) => (
            <SortableWidgetItem
              key={item.id}
              item={item}
              onUpdate={(patch) => onUpdateWidget(item.id, patch)}
            >
              {renderWidget(item)}
            </SortableWidgetItem>
          ))}
        </HomeWidgetGrid>
      </SortableContext>
    </DndContext>
  )
}
