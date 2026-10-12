import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  createExercise,
  getExercise,
  listExercises,
  setExerciseArchived,
} from '@/db/repositories/exerciseRepo'
import type { Exercise } from '@/domain/types'
import { Sheet } from '@/components/ui/Sheet'
import { ExercisePicker } from './ExercisePicker'
import { QuickExerciseForm } from './QuickExerciseForm'

/**
 * Liikkeen valinta ja pikaluonti samassa paneelissa (SPEC §6.2, §6.3).
 *
 * Paneeli omistaa tilan "haku ↔ uuden liikkeen lomake", joten reitti ei vaihdu
 * missään: kesken treenin luotu liike ei siirrä käyttäjää pois kirjausnäkymästä
 * eikä katkaise lepoajastinta. Haku pidetään mountattuna lomakkeen ajan, jotta
 * takaisin-nuoli palauttaa hakusanan, suodattimen ja vierityksen sellaisenaan.
 */
export interface ExercisePickerSheetProps {
  open: boolean
  onClose: () => void
  /** Otsikko hakutilassa. */
  title: string
  /** Pikalomakkeen tallennuspainike, esim. "Luo ja lisää treeniin". */
  createLabel: string
  /** Hakutilan yläosa, esim. "Lisää myös ohjelmaan" -kytkin. */
  header?: ReactNode
  multiple?: boolean
  selectedIds?: ReadonlySet<string>
  excludeIds?: ReadonlySet<string>
  emptyHint?: string
  onPick: (exercise: Exercise) => void
  /** Luotu liike: kutsuja lisää sen treeniin tai päivään. */
  onCreated: (exercise: Exercise) => void
}

export function ExercisePickerSheet({
  open,
  onClose,
  title,
  createLabel,
  header,
  multiple,
  selectedIds,
  excludeIds,
  emptyHint,
  onPick,
  onCreated,
}: ExercisePickerSheetProps) {
  /** `null` = haku, muuten uuden liikkeen nimiehdotus hakusanasta. */
  const [draftName, setDraftName] = useState<string | null>(null)
  const exercises = useLiveQuery(() => listExercises(), [], undefined)

  const close = (): void => {
    setDraftName(null)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={draftName === null ? title : 'Uusi liike'}
      size="tall"
      onBack={draftName === null ? undefined : () => setDraftName(null)}
    >
      {/*
        `hidden` jättää haun DOM:iin mutta pois saavutettavuuspuusta, joten
        hakusana säilyy eikä ruudunlukija lue kahta näkymää yhtä aikaa.
      */}
      <div hidden={draftName !== null}>
        {header}
        <ExercisePicker
          multiple={multiple}
          selectedIds={selectedIds}
          excludeIds={excludeIds}
          emptyHint={emptyHint}
          onPick={onPick}
          onCreate={(name) => setDraftName(name)}
        />
      </div>

      {draftName === null || exercises === undefined ? null : (
        <QuickExerciseForm
          initialName={draftName}
          exercises={exercises}
          submitLabel={createLabel}
          onUseExisting={(exercise) => {
            // Arkistoitu liike palautetaan käyttöön kaksoiskappaleen sijaan.
            const pick = (): void => {
              onPick({ ...exercise, archived: false })
              close()
            }
            if (!exercise.archived) {
              pick()
              return
            }
            void setExerciseArchived(exercise.id, false).then(pick)
          }}
          onSubmit={async (values) => {
            const id = await createExercise({
              name: values.name,
              primaryMuscles: values.primaryMuscles,
              secondaryMuscles: values.secondaryMuscles,
              equipment: values.equipment,
              kind: values.kind,
              increment: values.increment,
              defaultRestSec: values.defaultRestSec,
              defaultRepRange: { min: values.repMin, max: values.repMax },
              notes: values.notes,
            })
            const created = await getExercise(id)
            if (created) onCreated(created)
            close()
          }}
        />
      )}
    </Sheet>
  )
}
