import { createElement } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getExerciseImage } from '@/db/repositories/exerciseRepo'
import type { Exercise } from '@/domain/types'
import { equipmentIcon } from '@/components/icons'
import { useObjectUrl } from '@/lib/useObjectUrl'

/** Liikkeen oma kuva, tai välineikoni jos kuvaa ei ole (SPEC §7). */
export function ExerciseThumb({ exercise, size = 40 }: { exercise: Exercise; size?: number }) {
  const imageId = exercise.imageId
  const blob = useLiveQuery(
    () => (imageId === undefined ? Promise.resolve(undefined) : getExerciseImage(imageId)),
    [imageId],
    undefined,
  )
  const url = useObjectUrl(blob)

  if (url !== null) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="flex items-center justify-center rounded-lg bg-surface-2 text-muted"
      style={{ width: size, height: size }}
    >
      {/* createElement: ikonia ei sidota komponenttimuuttujaan renderin sisällä. */}
      {createElement(equipmentIcon(exercise.equipment), { size: Math.round(size * 0.55) })}
    </span>
  )
}
