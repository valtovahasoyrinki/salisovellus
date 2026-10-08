import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function OverviewScreen() {
  return (
    <>
      <ScreenHeader title="Analyysi" back />
      <EmptyState title="Analyysi" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
