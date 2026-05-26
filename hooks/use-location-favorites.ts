"use client"

import { useEffect, useState } from "react"
import {
  LOCATION_FAVORITES_EVENT,
  loadLocationFavorites,
  type LocationFavorite,
} from "@/lib/location-favorites"
import { useHydrated } from "@/hooks/use-hydrated"

export function useLocationFavorites(): LocationFavorite[] {
  const hydrated = useHydrated()
  const [favorites, setFavorites] = useState<LocationFavorite[]>([])

  useEffect(() => {
    if (!hydrated) return

    const sync = () => setFavorites(loadLocationFavorites())
    sync()
    window.addEventListener(LOCATION_FAVORITES_EVENT, sync)
    return () => window.removeEventListener(LOCATION_FAVORITES_EVENT, sync)
  }, [hydrated])

  return favorites
}
