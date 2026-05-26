"use client"

import { useEffect, useState } from "react"
import {
  TRAINING_TEMPLATES_EVENT,
  loadTrainingTemplates,
  type TrainingTemplate,
} from "@/lib/training-templates"
import { useHydrated } from "@/hooks/use-hydrated"

export function useTrainingTemplates(): TrainingTemplate[] {
  const hydrated = useHydrated()
  const [templates, setTemplates] = useState<TrainingTemplate[]>([])

  useEffect(() => {
    if (!hydrated) return

    const sync = () => setTemplates(loadTrainingTemplates())
    sync()
    window.addEventListener(TRAINING_TEMPLATES_EVENT, sync)
    return () => window.removeEventListener(TRAINING_TEMPLATES_EVENT, sync)
  }, [hydrated])

  return templates
}
