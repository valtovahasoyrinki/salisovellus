import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MuscleSelector, cycleMuscle, type MuscleSelection } from './MuscleSelector'

/**
 * Kartan napautusta ei testata täällä: jsdom ei toteuta `getScreenCTM`-matriisia,
 * joten osumalaskenta on `hitTest.test.ts`:n ja Playwrightin vastuulla.
 */
const EMPTY: MuscleSelection = { primary: [], secondary: [] }

/** Sirurivi on `fieldset`in sisällä, joten rooli "group" löytyy kahdesti – ulompi riittää. */
function chipRow(name: string): HTMLElement {
  const [group] = screen.getAllByRole('group', { name })
  return group
}

describe('cycleMuscle', () => {
  it('kiertää tilan kolmessa askeleessa takaisin alkuun', () => {
    const first = cycleMuscle(EMPTY, 'chest')
    expect(first).toEqual({ primary: ['chest'], secondary: [] })

    const second = cycleMuscle(first, 'chest')
    expect(second).toEqual({ primary: [], secondary: ['chest'] })

    const third = cycleMuscle(second, 'chest')
    expect(third).toEqual({ primary: [], secondary: [] })
  })

  it('siirtää ensisijaisen toissijaiseksi koskematta muihin valintoihin', () => {
    const value: MuscleSelection = { primary: ['chest', 'triceps'], secondary: ['front_delts'] }
    expect(cycleMuscle(value, 'chest')).toEqual({
      primary: ['triceps'],
      secondary: ['front_delts', 'chest'],
    })
  })

  it('lisää uuden valinnan listan loppuun, joten järjestys on vakaa', () => {
    const value: MuscleSelection = { primary: ['chest'], secondary: [] }
    expect(cycleMuscle(value, 'triceps').primary).toEqual(['chest', 'triceps'])
  })

  it('ei jätä samaa lihasta kahteen listaan', () => {
    for (const value of [
      EMPTY,
      { primary: ['chest'], secondary: [] },
      { primary: [], secondary: ['chest'] },
      // Rikkinäinen lähtötila: sama lihas molemmissa listoissa.
      { primary: ['chest'], secondary: ['chest'] },
    ] satisfies MuscleSelection[]) {
      const next = cycleMuscle(value, 'chest')
      const inBoth = next.primary.filter((id) => next.secondary.includes(id))
      expect(inBoth).toEqual([])
      expect(next.primary.length + next.secondary.length).toBeLessThanOrEqual(1)
    }
  })

  it('ei muuta annettua valintaa (puhdas funktio)', () => {
    const value: MuscleSelection = { primary: ['chest'], secondary: [] }
    cycleMuscle(value, 'chest')
    expect(value).toEqual({ primary: ['chest'], secondary: [] })
  })
})

describe('MuscleSelector', () => {
  it('maalaa ensisijaisen aksenttivärillä ja toissijaisen haaleammin', () => {
    const { container } = render(
      <MuscleSelector
        value={{ primary: ['chest'], secondary: ['front_delts'] }}
        onChange={vi.fn()}
      />,
    )

    const chest = [...container.querySelectorAll('[data-muscle="chest"]')]
    expect(chest.length).toBeGreaterThan(0)
    for (const path of chest) expect(path.getAttribute('fill')).toBe('var(--accent)')

    const delts = container.querySelector('[data-muscle="front_delts"]')
    expect(delts?.getAttribute('fill')).toBe('var(--muscle-secondary)')

    const abs = container.querySelector('[data-muscle="abs"]')
    expect(abs?.getAttribute('fill')).toBe('var(--muscle-idle)')
  })

  it('näyttää takamuodot, kun näkymä vaihdetaan takaa', () => {
    const { container } = render(<MuscleSelector value={EMPTY} onChange={vi.fn()} />)
    expect(container.querySelector('[data-muscle="lats"]')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Takaa' }))

    expect(container.querySelector('[data-muscle="lats"]')).not.toBeNull()
    expect(container.querySelector('[data-muscle="chest"]')).toBeNull()
  })

  it('kertoo valinnat suomeksi ruudunlukijalle', () => {
    render(
      <MuscleSelector value={{ primary: ['chest'], secondary: ['triceps'] }} onChange={vi.fn()} />,
    )
    const label = screen.getByRole('img').getAttribute('aria-label') ?? ''
    expect(label).toContain('edestä')
    expect(label).toContain('ensisijaiset Rinta')
    expect(label).toContain('toissijaiset Ojentaja')
  })

  it('rajatapaus tyhjä valinta: tekstivastine kertoo, ettei lihaksia ole valittu', () => {
    render(<MuscleSelector value={EMPTY} onChange={vi.fn()} />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Lihaskartta edestä, ei valittuja lihasryhmiä',
    )
  })

  it('varapolku: listasta valinta lisää lihaksen ensisijaisiin', () => {
    const onChange = vi.fn()
    render(<MuscleSelector value={EMPTY} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Valitse listasta' }))
    fireEvent.click(within(chipRow('Ensisijaiset lihasryhmät')).getByRole('button', { name: 'Rinta' }))

    expect(onChange).toHaveBeenCalledWith({ primary: ['chest'], secondary: [] })
  })

  it('varapolku: toissijaiseksi valinta poistaa lihaksen ensisijaisista', () => {
    const onChange = vi.fn()
    render(<MuscleSelector value={{ primary: ['chest'], secondary: [] }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Valitse listasta' }))
    fireEvent.click(within(chipRow('Toissijaiset lihasryhmät')).getByRole('button', { name: 'Rinta' }))

    expect(onChange).toHaveBeenCalledWith({ primary: [], secondary: ['chest'] })
  })

  it('varapolku: saman sirun uudelleenvalinta poistaa valinnan', () => {
    const onChange = vi.fn()
    render(<MuscleSelector value={{ primary: ['chest'], secondary: [] }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Valitse listasta' }))
    fireEvent.click(within(chipRow('Ensisijaiset lihasryhmät')).getByRole('button', { name: 'Rinta' }))

    expect(onChange).toHaveBeenCalledWith({ primary: [], secondary: [] })
  })

  it('valitun sirun napautus poistaa lihaksen', () => {
    const onChange = vi.fn()
    render(
      <MuscleSelector
        value={{ primary: ['chest'], secondary: ['triceps'] }}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Poista Rinta' })).toHaveTextContent(
      'Rinta · ensisijainen',
    )
    expect(screen.getByRole('button', { name: 'Poista Ojentaja' })).toHaveTextContent(
      'Ojentaja · toissijainen',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Poista Rinta' }))
    expect(onChange).toHaveBeenCalledWith({ primary: [], secondary: ['triceps'] })
  })

  it('näyttää virhetekstin kartan alla', () => {
    render(
      <MuscleSelector
        value={EMPTY}
        onChange={vi.fn()}
        error="Valitse vähintään yksi ensisijainen lihas"
      />,
    )
    expect(screen.getByText('Valitse vähintään yksi ensisijainen lihas')).toBeInTheDocument()
  })
})
