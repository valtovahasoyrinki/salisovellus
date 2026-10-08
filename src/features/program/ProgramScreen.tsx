import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ProgramScreen() {
  return (
    <>
      <ScreenHeader title="Ohjelma" back />
      <EmptyState title="Ohjelma" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
