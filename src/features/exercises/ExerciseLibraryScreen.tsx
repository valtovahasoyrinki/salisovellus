import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ExerciseLibraryScreen() {
  return (
    <>
      <ScreenHeader title="Liikekirjasto" back />
      <EmptyState title="Liikekirjasto" description="Näkymä rakennetaan seuraavassa vaiheessa." />
    </>
  )
}
