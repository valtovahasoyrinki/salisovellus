import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MuscleId } from '@/domain/types'
import { MuscleMap } from './MuscleMap'

describe('MuscleMap', () => {
  it('maalaa ensisijaisen lihaksen aksenttivärillä ja treenaamattoman neutraalisti', () => {
    const { container } = render(<MuscleMap view="front" primary={['chest']} />)

    const chest = [...container.querySelectorAll('[data-muscle="chest"]')]
    expect(chest.length).toBeGreaterThan(0)
    for (const path of chest) expect(path.getAttribute('fill')).toBe('var(--accent)')

    const quads = container.querySelector('[data-muscle="quads"]')
    expect(quads?.getAttribute('fill')).toBe('var(--muscle-idle)')
  })

  it('maalaa toissijaisen lihaksen haaleammin', () => {
    const { container } = render(<MuscleMap view="back" primary={['lats']} secondary={['triceps']} />)
    const triceps = [...container.querySelectorAll('[data-muscle="triceps"]')]
    expect(triceps.length).toBeGreaterThan(0)
    for (const path of triceps) expect(path.getAttribute('fill')).toBe('var(--muscle-secondary)')
  })

  it('säätää peittävyyttä viikon kuormituksen mukaan', () => {
    const { container } = render(
      <MuscleMap view="front" intensity={{ quads: 1, calves: 0.25 }} />,
    )
    const quads = container.querySelector('[data-muscle="quads"]')
    const calves = container.querySelector('[data-muscle="calves"]')
    expect(Number(quads?.getAttribute('fill-opacity'))).toBeCloseTo(1)
    expect(Number(calves?.getAttribute('fill-opacity'))).toBeCloseTo(0.415)
  })

  it('kertoo lihakset suomeksi ruudunlukijalle', () => {
    render(<MuscleMap view="both" primary={['chest', 'triceps']} secondary={['front_delts']} />)
    const label = screen.getByRole('img').getAttribute('aria-label') ?? ''
    expect(label).toContain('Rinta')
    expect(label).toContain('Ojentaja')
    expect(label).toContain('Etuolkapää')
  })

  it('kestää tuntemattoman lihastunnisteen kaatumatta', () => {
    // Tunniste voi tulla vanhasta varmuuskopiosta, jossa ryhmä on nimetty toisin.
    const unknown = ['tuntematon_lihas', 'chest'] as MuscleId[]
    const { container } = render(<MuscleMap view="both" primary={unknown} intensity={{ outo: 0.5 } as Partial<Record<MuscleId, number>>} />)

    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Lihaskartta: ensisijaiset Rinta')
    expect(container.querySelectorAll('[data-muscle="chest"]').length).toBeGreaterThan(0)
  })

  it('piirtää molemmat näkymät, kun view on both', () => {
    const { container } = render(<MuscleMap view="both" primary={['lats']} />)
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    const lats = [...container.querySelectorAll('[data-muscle="lats"]')]
    expect(lats).toHaveLength(2)
    for (const path of lats) expect(path.getAttribute('fill')).toBe('var(--accent)')
  })
})
