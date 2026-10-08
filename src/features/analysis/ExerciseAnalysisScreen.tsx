import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ExerciseAnalysisScreen() {
  return (
    <>
      <ScreenHeader title="Liikeanalyysi" back />
      <EmptyState title="Liikeanalyysi" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
