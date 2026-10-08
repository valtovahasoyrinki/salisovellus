import type { ReactNode } from 'react'
import { Reorder, useDragControls, useReducedMotion } from 'motion/react'
import { GripIcon } from '@/components/icons'
import { haptic } from '@/lib/haptics'

/**
 * Raahattava järjestyslista (SPEC §6.2): liikkeiden järjestys päivän sisällä.
 * Kahva on oma elementtinsä (`dragListener={false}`), jotta listan vieritys
 * toimii normaalisti eikä rivi tartu kiinni vahingossa. Kahva tukee myös
 * nuolinäppäimiä, joten järjestys on muutettavissa ilman raahaamista.
 */
export interface DragListProps<T> {
  items: T[]
  onReorder: (items: T[]) => void
  /** Rivin sisältö. `handle` on sijoitettava riville – ilman sitä riviä ei voi raahata. */
  renderItem: (item: T, handle: ReactNode) => ReactNode
  getKey: (item: T) => string
  /** Rivin nimi ruudunlukijalle, näkyy kahvan nimessä. */
  getLabel?: (item: T) => string
  /** Listan nimi ruudunlukijalle. */
  label: string
  className?: string
}

export function DragList<T>({
  items,
  onReorder,
  renderItem,
  getKey,
  getLabel,
  label,
  className = '',
}: DragListProps<T>) {
  const move = (from: number, to: number): void => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    if (moved === undefined) return
    next.splice(to, 0, moved)
    haptic('tap')
    onReorder(next)
  }

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={items}
      onReorder={onReorder}
      aria-label={label}
      className={`flex flex-col gap-2 ${className}`}
    >
      {items.map((item, index) => (
        <DragListRow
          key={getKey(item)}
          item={item}
          handleLabel={getLabel ? `Järjestä: ${getLabel(item)}` : 'Järjestä raahaamalla'}
          onMoveUp={() => move(index, index - 1)}
          onMoveDown={() => move(index, index + 1)}
          renderItem={renderItem}
        />
      ))}
    </Reorder.Group>
  )
}

function DragListRow<T>({
  item,
  handleLabel,
  onMoveUp,
  onMoveDown,
  renderItem,
}: {
  item: T
  handleLabel: string
  onMoveUp: () => void
  onMoveDown: () => void
  renderItem: (item: T, handle: ReactNode) => ReactNode
}) {
  const controls = useDragControls()
  const reduced = useReducedMotion()

  const handle = (
    <button
      type="button"
      aria-label={handleLabel}
      onPointerDown={(event) => {
        haptic('tap')
        controls.start(event)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          onMoveUp()
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          onMoveDown()
        }
      }}
      className="flex size-12 shrink-0 touch-none items-center justify-center rounded-lg text-muted active:bg-surface-3 active:text-text"
    >
      <GripIcon />
    </button>
  )

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={reduced ? undefined : { scale: 1.02, boxShadow: 'var(--shadow-float)' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
      className="list-none"
    >
      {renderItem(item, handle)}
    </Reorder.Item>
  )
}
