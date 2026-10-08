import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ExerciseDetailScreen() {
  return (
    <>
      <ScreenHeader title="Liike" back />
      <EmptyState title="Liike" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
