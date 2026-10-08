import { useEffect, useMemo } from 'react'

/** Blobin näyttäminen img-elementissä ilman muistivuotoa. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  useEffect(() => {
    if (url === null) return
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [url])

  return url
}
