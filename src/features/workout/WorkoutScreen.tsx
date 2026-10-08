import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function WorkoutScreen() {
  return (
    <>
      <ScreenHeader title="Treeni" />
      <EmptyState title="Treeni" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
