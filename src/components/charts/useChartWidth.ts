import { useEffect, useRef, useState } from 'react'

/**
 * Kaavion leveys mitataan elementistä, jotta SVG piirtyy oikeassa mittakaavassa
 * eikä viivanpaksuus veny `preserveAspectRatio`-skaalauksessa.
 */
export function useChartWidth(initial = 320): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(initial)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next !== undefined && next > 0) setWidth(Math.round(next))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
