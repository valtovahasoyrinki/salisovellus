import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function WorkoutStartScreen() {
  return (
    <>
      <ScreenHeader title="Aloita treeni" />
      <EmptyState title="Aloita treeni" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
