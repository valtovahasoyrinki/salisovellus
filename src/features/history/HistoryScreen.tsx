import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function HistoryScreen() {
  return (
    <>
      <ScreenHeader title="Historia" back />
      <EmptyState title="Historia" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
