/**
 * Liikkeen oma kuva: pakataan ennen IndexedDB:hen tallennusta (SPEC §6.2).
 * Enintään 1000 px pitkä sivu, JPEG-laatu 0,8 – riittää korttikuvaksi ja
 * pitää tietokannan pienenä varmuuskopiointia varten.
 */
const MAX_EDGE = 1000
const QUALITY = 0.8

export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  })
  return blob ?? file
}
