import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function SettingsScreen() {
  return (
    <>
      <ScreenHeader title="Asetukset" back />
      <EmptyState title="Asetukset" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
