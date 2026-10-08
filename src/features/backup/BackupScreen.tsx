import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function BackupScreen() {
  return (
    <>
      <ScreenHeader title="Varmuuskopio" back />
      <EmptyState title="Varmuuskopio" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
