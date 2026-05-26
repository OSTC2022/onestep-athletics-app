import { useEffect, useState } from "react"

/** True after the client has mounted — safe to read localStorage without hydration mismatch. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}
