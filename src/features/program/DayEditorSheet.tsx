import { useState } from 'react'
import type { DayIcon, WorkoutDay } from '@/domain/types'
import { DAY_COLORS } from '@/db/repositories/programRepo'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { TextField } from '@/components/ui/TextField'
import { dayIcon } from '@/components/icons'

const ICONS: Array<{ id: DayIcon; label: string }> = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Jalat' },
  { id: 'upper', label: 'Ylä' },
  { id: 'lower', label: 'Ala' },
  { id: 'full', label: 'Koko' },
  { id: 'arms', label: 'Kädet' },
  { id: 'core', label: 'Keski' },
]

export interface DayEditorSheetProps {
  open: boolean
  /** `null` = uusi päivä. */
  day: WorkoutDay | null
  onClose: () => void
  onSubmit: (values: { name: string; icon: DayIcon; color: string }) => void | Promise<void>
  onDelete?: (day: WorkoutDay) => void
}

/** Treenipäivän nimi, ikoni ja väri (SPEC §6.2, §7). */
export function DayEditorSheet({ open, day, onClose, onSubmit, onDelete }: DayEditorSheetProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<DayIcon>('push')
  const [color, setColor] = useState<string>(DAY_COLORS[0])
  const [error, setError] = useState<string | undefined>(undefined)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  // Arvot ladataan kerran, kun lomake avataan uudelle kohteelle.
  const openKey = open ? (day?.id ?? 'new') : null
  if (openKey !== loadedKey) {
    setLoadedKey(openKey)
    setName(day?.name ?? '')
    setIcon(day?.icon ?? 'push')
    setColor(day?.color ?? DAY_COLORS[0])
    setError(undefined)
  }

  const submit = (): void => {
    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Anna päivälle nimi')
      return
    }
    void onSubmit({ name: trimmed, icon, color })
  }

  return (
    <Sheet open={open} onClose={onClose} title={day === null ? 'Uusi treenipäivä' : 'Muokkaa päivää'}>
      <div className="space-y-5">
        <TextField
          label="Nimi"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={error}
          placeholder="Esim. Push"
          autoComplete="off"
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Ikoni</legend>
          <div className="grid grid-cols-4 gap-2">
            {ICONS.map((option) => {
              const Icon = dayIcon(option.id)
              const selected = option.id === icon
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setIcon(option.id)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs ${
                    selected
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-border bg-surface-2 text-muted'
                  }`}
                >
                  <Icon size={22} />
                  {option.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Väri</legend>
          <div className="flex flex-wrap gap-2">
            {DAY_COLORS.map((token) => (
              <button
                key={token}
                type="button"
                aria-label={`Väri ${token.replace('day-', '')}`}
                aria-pressed={token === color}
                onClick={() => setColor(token)}
                className={`size-12 rounded-xl border-2 ${
                  token === color ? 'border-text' : 'border-transparent'
                }`}
                style={{ backgroundColor: `var(--${token})` }}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Peruuta
          </Button>
          <Button variant="primary" fullWidth onClick={submit}>
            Tallenna
          </Button>
        </div>

        {day !== null && onDelete ? (
          <Button variant="ghost" fullWidth className="text-danger" onClick={() => onDelete(day)}>
            Poista treenipäivä
          </Button>
        ) : null}
      </div>
    </Sheet>
  )
}
