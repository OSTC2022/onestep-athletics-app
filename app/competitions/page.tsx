import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import { CompetitionsPage } from "@/components/competitions-page"

export default function Competitions() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <CompetitionsPage />
      </Suspense>
    </AppShell>
  )
}
