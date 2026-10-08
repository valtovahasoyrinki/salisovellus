/**
 * Lajiteltavat tunnisteet: aikaleima base36:na + satunnaisuus.
 *
 * `crypto.randomUUID()` vaatii secure contextin, joka puuttuu paljaalta
 * LAN-HTTP-osoitteelta puhelintestauksessa. Aikaleimaprefix tekee ID:istä
 * myös luonnostaan järjestyksessä olevia, mikä auttaa Dexien indekseissä.
 */
const RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomPart(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) {
    out += RANDOM_CHARS[byte % RANDOM_CHARS.length]
  }
  return out
}

export function newId(): string {
  return `${Date.now().toString(36)}${randomPart(8)}`
}
