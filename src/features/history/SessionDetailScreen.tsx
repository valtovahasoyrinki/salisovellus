import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function SessionDetailScreen() {
  return (
    <>
      <ScreenHeader title="Treeni" back />
      <EmptyState title="Treeni" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
