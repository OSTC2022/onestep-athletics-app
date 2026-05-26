import { AppShell } from "@/components/app-shell"
import { TrainingSessionEditPage } from "@/components/training-session-edit-page"

export default async function TrainingEditRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppShell>
      <TrainingSessionEditPage id={id} />
    </AppShell>
  )
}
