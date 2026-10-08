import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function OnboardingScreen() {
  return (
    <>
      <ScreenHeader title="Käyttöönotto" back />
      <EmptyState title="Käyttöönotto" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
