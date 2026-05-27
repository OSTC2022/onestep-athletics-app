"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

type CollapsibleController = {
  setOpen: (open: boolean) => void
}

type CollapsibleSectionContextValue = {
  register: (id: string, controller: CollapsibleController) => () => void
  collapseAll: () => void
  expandAll: () => void
}

const CollapsibleSectionContext =
  createContext<CollapsibleSectionContextValue | null>(null)

export function CollapsibleSectionProvider({ children }: { children: ReactNode }) {
  const controllersRef = useRef(new Map<string, CollapsibleController>())

  const register = useCallback((id: string, controller: CollapsibleController) => {
    controllersRef.current.set(id, controller)
    return () => {
      controllersRef.current.delete(id)
    }
  }, [])

  const setAll = useCallback((open: boolean) => {
    controllersRef.current.forEach((controller) => controller.setOpen(open))
  }, [])

  const value = useMemo(
    () => ({
      register,
      collapseAll: () => setAll(false),
      expandAll: () => setAll(true),
    }),
    [register, setAll]
  )

  return (
    <CollapsibleSectionContext.Provider value={value}>
      {children}
    </CollapsibleSectionContext.Provider>
  )
}

export function useCollapsibleOpen(sectionId: string | undefined, defaultOpen: boolean) {
  const ctx = useContext(CollapsibleSectionContext)
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!ctx || !sectionId) return
    return ctx.register(sectionId, { setOpen })
  }, [ctx, sectionId])

  return [open, setOpen] as const
}

export function CollapsibleGroupToolbar({ className }: { className?: string }) {
  const ctx = useContext(CollapsibleSectionContext)
  const [allOpen, setAllOpen] = useState(true)

  if (!ctx) return null

  const handleToggle = () => {
    if (allOpen) {
      ctx.collapseAll()
      setAllOpen(false)
    } else {
      ctx.expandAll()
      setAllOpen(true)
    }
  }

  return (
    <div className={cn("flex items-center justify-end", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
        aria-label={allOpen ? "모두 접기" : "모두 펼치기"}
      >
        {allOpen ? (
          <>
            <ChevronsDownUp className="h-3 w-3" />
            모두 접기
          </>
        ) : (
          <>
            <ChevronsUpDown className="h-3 w-3" />
            모두 펼치기
          </>
        )}
      </button>
    </div>
  )
}

export function CollapsibleSectionToolbar({ className }: { className?: string }) {
  const ctx = useContext(CollapsibleSectionContext)
  const [allOpen, setAllOpen] = useState(true)

  if (!ctx) return null

  const handleToggle = () => {
    if (allOpen) {
      ctx.collapseAll()
      setAllOpen(false)
    } else {
      ctx.expandAll()
      setAllOpen(true)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-end rounded-xl border border-border/60 bg-secondary/25 px-2 py-1.5",
        className
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
        aria-label={allOpen ? "전체 접기" : "전체 펼치기"}
      >
        {allOpen ? (
          <>
            <ChevronsDownUp className="h-3.5 w-3.5" />
            전체 접기
          </>
        ) : (
          <>
            <ChevronsUpDown className="h-3.5 w-3.5" />
            전체 펼치기
          </>
        )}
      </button>
    </div>
  )
}
