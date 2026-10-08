import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function DayScreen() {
  return (
    <>
      <ScreenHeader title="Treenipäivä" back />
      <EmptyState title="Treenipäivä" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
