"use client"

import { type ReactNode } from "react"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useCollapsibleOpen } from "@/components/collapsible-section-context"
import { cn } from "@/lib/utils"

function CollapseChevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <ChevronDown
      className={cn(
        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
        open && "rotate-180",
        className
      )}
    />
  )
}

export function CollapsibleCard({
  icon: Icon,
  title,
  summary,
  defaultOpen = true,
  sectionId,
  headerRight,
  headerFooter,
  contentClassName,
  className,
  id,
  children,
}: {
  icon?: LucideIcon
  title: string
  summary?: string
  defaultOpen?: boolean
  sectionId?: string
  headerRight?: ReactNode
  headerFooter?: ReactNode
  contentClassName?: string
  className?: string
  id?: string
  children: ReactNode
}) {
  const [open, setOpen] = useCollapsibleOpen(sectionId, defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "bg-card border-border overflow-hidden py-0 gap-0 shadow-none",
          className
        )}
        id={id}
      >
        <div
          className={cn(
            "px-3 transition-[padding]",
            open ? "pt-3 pb-2" : "py-1"
          )}
        >
          <div className="flex items-center gap-0.5">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-md px-1 py-0 hover:bg-secondary/30 transition-colors"
              >
                {Icon ? (
                  <Icon className="h-4 w-4 text-accent shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-tight">{title}</p>
                  {!open && summary ? (
                    <p className="text-[11px] text-muted-foreground leading-tight truncate">
                      {summary}
                    </p>
                  ) : null}
                </div>
              </button>
            </CollapsibleTrigger>
            {headerRight ? (
              <div className="shrink-0">{headerRight}</div>
            ) : null}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md hover:bg-secondary/30 transition-colors"
                aria-label={open ? "접기" : "펼치기"}
              >
                <CollapseChevron open={open} />
              </button>
            </CollapsibleTrigger>
          </div>
          {open && headerFooter ? (
            <div className="mt-1.5 pl-1">{headerFooter}</div>
          ) : null}
        </div>
        <CollapsibleContent>
          <CardContent className={cn("pt-0 pb-4 px-4 space-y-3", contentClassName)}>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function CollapsibleInlineSection({
  title,
  summary,
  defaultOpen = true,
  sectionId,
  className,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  sectionId?: string
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useCollapsibleOpen(sectionId, defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <div
        className={cn(
          "flex items-center gap-1 rounded-xl bg-secondary/30 pr-1 transition-[padding]",
          open ? "pt-1 pb-0.5" : "py-1"
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex-1 min-w-0 flex items-center gap-2 rounded-xl px-3 text-left hover:bg-secondary/50 transition-colors",
              open ? "py-1.5" : "py-0"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-tight">{title}</p>
              {!open && summary ? (
                <p className="text-[10px] text-muted-foreground leading-tight truncate">
                  {summary}
                </p>
              ) : null}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md hover:bg-secondary/50 transition-colors"
            aria-label={open ? "접기" : "펼치기"}
          >
            <CollapseChevron open={open} />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className={cn(open ? "pt-2" : "pt-0")}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CollapsibleFoldPanel({
  defaultOpen = true,
  sectionId,
  header,
  summary,
  toolbar,
  children,
  className,
  contentClassName,
}: {
  defaultOpen?: boolean
  sectionId?: string
  header: ReactNode
  summary?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  const [open, setOpen] = useCollapsibleOpen(sectionId, defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("overflow-hidden", className)}>
        <div className="flex items-start gap-1 pr-1 pt-2 pb-1">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex-1 min-w-0 text-left px-3 py-0 hover:bg-secondary/25 rounded-md"
            >
              {header}
              {!open && summary ? summary : null}
            </button>
          </CollapsibleTrigger>
          <div className="flex w-6 shrink-0 flex-col items-center gap-0.5 pt-0.5">
            {toolbar ?? <span className="h-6 w-6 shrink-0" aria-hidden="true" />}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center shrink-0 rounded-md hover:bg-secondary/30 transition-colors"
                aria-label={open ? "접기" : "펼치기"}
              >
                <CollapseChevron open={open} />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div
            className={cn(
              "border-t border-border/30 px-3 pb-3 pt-2 space-y-2",
              contentClassName
            )}
          >
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
