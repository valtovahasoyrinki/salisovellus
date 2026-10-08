import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function SummaryScreen() {
  return (
    <>
      <ScreenHeader title="Yhteenveto" />
      <EmptyState title="Yhteenveto" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
