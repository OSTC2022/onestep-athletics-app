import { AppShell } from "@/components/app-shell"
import { TrainingSessionDetailPage } from "@/components/training-session-detail-page"

export default async function TrainingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AppShell>
      <TrainingSessionDetailPage id={id} />
    </AppShell>
  )
}
