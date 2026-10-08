import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function HomeScreen() {
  return (
    <>
      <ScreenHeader title="Koti" />
      <EmptyState title="Koti" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
