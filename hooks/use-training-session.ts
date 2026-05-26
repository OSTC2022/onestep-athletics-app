"use client"

import { useEffect, useState } from "react"
import {
  TRAINING_SESSION_EVENT,
  getDefaultTrainingSessionSnapshot,
  getTodayTrainingSession,
  getTrainingSessionById,
  type TrainingSession,
} from "@/lib/training-session"
import { useHydrated } from "@/hooks/use-hydrated"

export function useTodayTrainingSession(): TrainingSession | null {
  const hydrated = useHydrated()
  const [session, setSession] = useState<TrainingSession | null>(
    getDefaultTrainingSessionSnapshot
  )

  useEffect(() => {
    if (!hydrated) return

    const sync = () => {
      setSession(getTodayTrainingSession())
    }

    sync()
    window.addEventListener(TRAINING_SESSION_EVENT, sync)
    return () => window.removeEventListener(TRAINING_SESSION_EVENT, sync)
  }, [hydrated])

  return session
}

export function useTrainingSession(id: string | null): TrainingSession | null {
  const hydrated = useHydrated()
  const [session, setSession] = useState<TrainingSession | null>(null)

  useEffect(() => {
    if (!hydrated || !id) {
      setSession(null)
      return
    }

    const sync = () => {
      setSession(getTrainingSessionById(id))
    }

    sync()
    window.addEventListener(TRAINING_SESSION_EVENT, sync)
    return () => window.removeEventListener(TRAINING_SESSION_EVENT, sync)
  }, [hydrated, id])

  return session
}
