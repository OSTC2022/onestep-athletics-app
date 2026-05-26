"use client"

import { useEffect, useState } from "react"
import {
  AUTH_EVENT,
  DEFAULT_CURRENT_USER,
  getCurrentUser,
  type AppUser,
} from "@/lib/auth"
import { canManageTraining } from "@/lib/permissions"
import { useHydrated } from "@/hooks/use-hydrated"

export function useCurrentUser(): AppUser {
  const hydrated = useHydrated()
  const [user, setUser] = useState<AppUser>(DEFAULT_CURRENT_USER)

  useEffect(() => {
    if (!hydrated) return

    const sync = () => setUser(getCurrentUser())
    sync()
    window.addEventListener(AUTH_EVENT, sync)
    return () => window.removeEventListener(AUTH_EVENT, sync)
  }, [hydrated])

  return user
}

export function useCanManageTraining(): boolean {
  const hydrated = useHydrated()
  const user = useCurrentUser()
  if (!hydrated) return false
  return canManageTraining(user)
}
